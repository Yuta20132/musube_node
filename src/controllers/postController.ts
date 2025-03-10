import { createGetCommentsByPostIdQuery, createGetPostInfoQuery, createPostQuery } from "../components/createQuery";
import pool from "../db/client";
import { getCommentsRequest, getCommentsResponse, post_info, post_registration } from "../model/Post";
export const PostCreateController = async (post: post_registration, category_id: Number) => {

  let client;
  try {
    const query: string = createPostQuery();
    console.log("ポストを投稿するクエリ")
    console.log(query);

    client = await pool.connect();
    const result = await client.query(query,[post.thread_id,category_id,post.user_id,post.content,post.title])

    if (result.rowCount === 0) {
      console.log(result.rowCount);
      console.log("投稿失敗");
      throw new Error("thread_iDまたはcategory_idが異なるため投稿に失敗しました");
    } else {
      console.log("投稿成功");
      console.log(result.rowCount);
    }

    
  } catch (error) {
    if (error instanceof Error) {

      // errorにcodeが存在するか確認してから出力
      if ('code' in error) {
        //外部キー制約に違反している場合
        if (error.code === "23503") {
          if ('detail' in error) {
            console.log(error.detail);
            //error.detailにはどの外部キー制約に違反しているかが格納されている
            //"threads"が含まれている場合はスレッドのIDが外部キー制約に違反している
            if ((error as any).detail.includes("threads")) {
              console.log("指定されたスレッドが存在せず、外部キー制約に違反しています");
              throw new Error("指定されたスレッドが存在しません");
            } else if ((error as any).detail.includes("users")) {
              console.log("指定されたユーザが存在せず、外部キー制約に違反しています");
              throw new Error("指定されたユーザが存在しません");
            }
          } else {
            console.log(`エラーコード ${error.code}: ${error.message}`);
            throw new Error("データベースエラー")
          }
        } else {
          console.log(`エラーコード ${error.code}: ${error.message}`);
          throw new Error("データベースエラー")
        }
      } else {
        console.log("Error does not have a code.");
        throw new Error(error.message);
      }

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
};

export const PostDeleteController = async (post_id: number) => {
  let client;

  try {
    client = await pool.connect();
    const query = "DELETE FROM posts WHERE id = $1";
    const result = await client.query(query, [post_id]);

    console.log(result.rowCount);
    if (result.rowCount === 0) {
      throw new Error("指定された投稿が存在しません");
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
  }
}

export const PostGetController = async (post_id: Number): Promise<post_info> => {

  let client;
  try {
    client = await pool.connect();
    const query = createGetPostInfoQuery();
    const result = await client.query(query, [post_id]);

    if (result.rowCount === 0) {
      throw new Error("指定された投稿は存在しません");
    }

    console.dir(result.rows[0]);

    //post_infoの型を作成
    const post_info: post_info = {
      title: result.rows[0].title,
      content: result.rows[0].content,
      category_id: result.rows[0].category_id,
      user_id: result.rows[0].user_id,
      created_at: result.rows[0].created_at
    }

    return post_info;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("なんらかのエラーが発生しました" + error);
    }
  } finally {
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
}

export const CommentGetByPostIdController = async (p_req: getCommentsRequest): Promise<getCommentsResponse> => {
  let client;
  try {
    client = await pool.connect();
    const query = createGetCommentsByPostIdQuery();

    const result = await client.query(query, [p_req.post_id]);

    //result.rowCountがnullの場合はエラーを返す
    if (result.rowCount === null) {
      throw new Error("データベースエラー");
    }

    if (result.rowCount === 0) {
      throw new Error("指定された投稿にコメントはありません");
    }

    const response: getCommentsResponse = {
      post_id: p_req.post_id,
      post_content: "tmp",
      post_title: "tmp",
      post_userId: "tmp",
      created_at: new Date(),
      rowCounts: result.rowCount,
      rows: result.rows
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("なんらかのエラーが発生しました" + error);
    }
  } finally {
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
}