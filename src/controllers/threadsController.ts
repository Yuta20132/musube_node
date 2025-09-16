import { get } from "http";
import {  createGetCategoryQuery, CreateGetPostsByThreadIdQuery, createGetThreadInfoQuery, createGetThreadsQuery, createThreadQuery, createGetThreadsWithPaginationQuery, createGetThreadsCountQuery } from "../components/createQuery";
import pool from "../db/client";
import { getPostsRequest, getPostsResponse, Thread, thread_info, thread_registration } from "../model/Threads";
import { user_login } from "../model/User";
import { PaginationMeta } from "../types/pagination";
import { validatePaginationParams, calculatePagination, calculateOffset } from "../utils/paginationHelper";



export const ThreadRegistrationController = async(thread: thread_registration):Promise<boolean> => {
  

  let is_success = false;
  let client;
  try {
    //データベースに接続
    client = await pool.connect();
    console.log("connected");

    //トランザクション開始
    await client.query("BEGIN");

    const query_createThread = createThreadQuery(thread);
    console.log("スレッドを作成するクエリ\n");
    console.log(query_createThread);
    const result = await client.query(query_createThread);

    //もしresult.rowCountが0だったらエラーを返す
    if (result.rowCount === 0) {
      console.log(result.rowCount);
      console.log("スレッドの作成に失敗");
      throw new Error("スレッドの作成に失敗しました");
    } else {
      console.log("スレッドの作成に成功");
      console.log(result.rowCount);
    }

    //コミット
    await client.query("COMMIT");

    is_success = true;
  } catch (err) {
    //console.log(err);
    if (err instanceof Error) {
      throw new Error(err.message);
    } else {
      throw new Error("Error registering user");
    }
  } finally {
    //データベースとの接続を切断
    if (client) {
      client.release();
    }
    console.log("disconnected\n");

  }
  return is_success;
}

//user_loginを受け取ってThreadを返す
export const ThreadGetController = async(category_id:string):Promise<Thread[]> => {

  let client;
  try {
    //データベースに接続
    client = await pool.connect();
    console.log("connected");

    const query:string = createGetThreadsQuery(category_id);

    console.log("スレッドを取得するクエリ\n");
    console.log(query);

    const result = await client.query(query);
    console.log("スレッドを取得");
    console.log(result.rows);

    const threads:Thread[] = result.rows;
    return threads;
  } catch(error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("なんらかのエラーが発生しました" + error);
    }
  } finally {
    //データベースとの接続を切断
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
}

export const GetPostsByThreadIdController = async(req_params:getPostsRequest): Promise<getPostsResponse> => {

  let client;
  try {
    //データベースに接続
    client = await pool.connect();
    console.log("connected");

    const query:string = CreateGetPostsByThreadIdQuery();
    console.log("ポストを取得するクエリ\n");
    console.log(query);

    console.log(req_params);

    const result = await client.query(query, [req_params.thread_id, req_params.limit, req_params.offset]);
    console.log("ポストを取得");
    console.log(result.rows);

    //result.rowCountsがない場合はエラーを返す
    //0の場合もあるから注意
    // if (result.rowCount === 0) {
    //   throw new Error("ポストが存在しません");
    // }

    const posts:getPostsResponse = {
      thread_id: req_params.thread_id,
      thread_title: result.rowCount === 0 ? "" : result.rows[0].thread_title,
      thread_description: result.rowCount === 0 ? "" : result.rows[0].thread_description,
      rowCounts: result.rowCount === 0 ? 0 : result.rows[0].rowcounts,//0の場合もあるから注意
      offset: req_params.offset ? req_params.offset : 0,
      limit: req_params.limit ? req_params.limit : 5,
      rows: result.rows,
    };
    
    return posts;
  } catch(error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("なんらかのエラーが発生しました" + error);
    }
  } finally {
    //データベースとの接続を切断
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }

}

export const ThreadCategoryGetController = async(thread_id:number):Promise<thread_info> => {

  let client;
  try {
    //データベースに接続
    client = await pool.connect();
    console.log("connected");

    const query:string = createGetThreadInfoQuery();
    console.log("スレッドのカテゴリを取得するクエリ\n");
    console.log(query);

    const result = await client.query(query, [thread_id]);
    console.log("スレッドのカテゴリを取得");
    console.log(result.rows);

    if (result.rowCount === 0) {
      throw new Error("指定されたスレッドは存在しません");
    }

    const tInfo: thread_info = result.rows[0];

    return tInfo;
  } catch(error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("なんらかのエラーが発生しました" + error);
    }
  } finally {
    //データベースとの接続を切断
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
}

export const ThreadDeleteController = async (thread_id: number) => {
  let client;

  try {
    client = await pool.connect();
    const query = "DELETE FROM threads WHERE id = $1";
    const result = await client.query(query, [thread_id]);

    console.log(result.rowCount);
    if (result.rowCount === 0) {
      throw new Error("指定されたスレッドが存在しません");
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
    }} finally {
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
};
// カテゴリIDからスレッドをページネーション付きで取得
export const ThreadGetWithPaginationController = async (
  category_id: string | number,
  page: number = 1,
  limit: number = 20
): Promise<{ threads: Thread[]; pagination: PaginationMeta }> => {
  let client;
  try {
    // パラメータを検証
    const { page: validPage, limit: validLimit } = validatePaginationParams(page, limit);

    // DB 接続
    client = await pool.connect();
    console.log("connected");

    // 総件数の取得
    const countQuery = createGetThreadsCountQuery();
    const countResult = await client.query(countQuery, [category_id]);
    const total = parseInt(countResult.rows[0].total);

    // ページネーション情報の計算
    const pagination = calculatePagination(validPage, validLimit, total);

    // オフセット計算
    const offset = calculateOffset(validPage, validLimit);

    // スレッド取得（ページネーション対応）
    const listQuery = createGetThreadsWithPaginationQuery();
    const listResult = await client.query(listQuery, [category_id, validLimit, offset]);

    const threads: Thread[] = listResult.rows;

    return { threads, pagination };
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

