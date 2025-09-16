import { createAdminCommentQuery, createCommentQuery, createGetCommentByIdQuery, createUpdateCommentQuery } from "../components/createQuery";
import pool from "../db/client";

export const CommentCreateController = async (post_id: number, user_id: string, content: string, category_id: number) => {
  let client;

  try {
    client = await pool.connect();

    //分けてるの気にしなくていい
    //なんなら分けなくていい

    console.log("コメントを投稿するクエリの作成");
    if(category_id === 5) {
      const query = createAdminCommentQuery();
      const result = await client.query(query, [post_id, user_id, content]);
      //もしresult.rowCountが0だったらエラーを返す
      if (result.rowCount === 0) {
        console.dir(result, { depth: null });
        console.log("コメントの投稿に失敗");
        throw new Error("コメントの投稿に失敗しました");
      } else {
        console.log("コメントの投稿に成功");
        //console.log(result.rowCount);
      }
    } else {
      const query = createCommentQuery();
      const result = await client.query(query, [post_id, user_id, content]);
      
      if (result.rowCount === 0) {
        console.log(result.rowCount);
        console.log("コメントの投稿に失敗");
        throw new Error("post_idとcategory_idの組み合わせが異なるためコメントに失敗しました");
      } else {
        console.log("コメントの投稿に成功");
        //console.log(result.rowCount);
      }
    }
    

  } catch (error) {
    if (error instanceof Error) {
      console.log("コメント投稿エラー", error);
      throw new Error("エラーが発生");
    } else {
      console.log("予期しないエラー: ", error)
      throw new Error("何らかのエラーが発生");
    }
  } finally {
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
}

export const CommentDeleteController = async (comment_id: number) => {
  let client;

  try {
    client = await pool.connect();
    const query = "DELETE FROM comments WHERE id = $1";
    const result = await client.query(query, [comment_id]);

    console.log(result.rowCount);
    if (result.rowCount === 0) {
      throw new Error("指定されたコメントが存在しません");
    } else {
      console.log(result.rowCount);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message);
      throw new Error(error.message);
    } else {
      console.log("予期しないエラー", error);
      throw new Error("何らかのエラーが発生");
    }
  } finally {
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
}

export const CommentUpdateController = async (comment_id: number, content: string, user_id: string) => {
  let client;

  try {
    client = await pool.connect();
    
    // まずコメントが存在し、ユーザが投稿者であることを確認
    const getCommentQuery = createGetCommentByIdQuery();
    const commentResult = await client.query(getCommentQuery, [comment_id]);

    if (commentResult.rowCount === 0) {
      throw new Error("指定されたコメントが存在しません");
    }

    const comment = commentResult.rows[0];
    if (comment.user_id !== user_id) {
      throw new Error("このコメントを編集する権限がありません");
    }

    // コメントを更新
    const updateQuery = createUpdateCommentQuery();
    const updateResult = await client.query(updateQuery, [content, comment_id, user_id]);

    if (updateResult.rowCount === 0) {
      throw new Error("コメントの更新に失敗しました");
    }

    console.log("コメントの更新に成功");
    return updateResult.rows[0];

  } catch (error) {
    if (error instanceof Error) {
      console.log("コメント更新エラー", error.message);
      throw new Error(error.message);
    } else {
      console.log("予期しないエラー: ", error);
      throw new Error("何らかのエラーが発生");
    }
  } finally {
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
}