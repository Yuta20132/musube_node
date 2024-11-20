import { createAdminCommentQuery, createCommentQuery } from "../components/createQuery";
import pool from "../db/client";

export const CommentCreateController = async (post_id: number, user_id: string, content: string) => {
  let client;

  try {
    client = await pool.connect();

    console.log("コメントを投稿するクエリの作成");
    const query = createCommentQuery();
    const result = await client.query(query, [post_id, user_id, content]);
    if (result.rowCount === 0) {
      console.log("コメントの投稿に失敗");
      throw new Error("コメントの投稿に失敗しました");
    } else {
      console.log("コメントの投稿に成功");
    }
    // if(category_id === 5) {
    //   const query = createAdminCommentQuery();
    //   const result = await client.query(query, [post_id, user_id, content]);
    //   //もしresult.rowCountが0だったらエラーを返す
    //   if (result.rowCount === 0) {
    //     console.dir(result, { depth: null });
    //     console.log("コメントの投稿に失敗");
    //     throw new Error("コメントの投稿に失敗しました");
    //   } else {
    //     console.log("コメントの投稿に成功");
    //     //console.log(result.rowCount);
    //   }
    // } else {
    //   const query = createCommentQuery();
    //   const result = await client.query(query, [post_id, user_id, content]);
      
    //   if (result.rowCount === 0) {
    //     console.log(result.rowCount);
    //     console.log("コメントの投稿に失敗");
    //     throw new Error("post_idとcategory_idの組み合わせが異なるためコメントに失敗しました");
    //   } else {
    //     console.log("コメントの投稿に成功");
    //     //console.log(result.rowCount);
    //   }
    // }
    

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

    const query = `
      DELETE FROM comments WHERE id = $1;
    `;
    const result = await client.query(query, [comment_id]);

    console.dir(result, { depth: null });

    if (result.rowCount === 0) {
      console.log("コメントの削除に失敗");
      throw new Error("コメントの削除に失敗しました");
    } else {
      console.log("コメントの削除に成功");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log("コメント削除エラー", error);
      throw new Error("エラーが発生");
    } else {
      console.log("予期しないエラー: ", error)
      throw new Error("何らかのエラーが発生");
    }
  }
}