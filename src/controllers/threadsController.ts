import { get } from "http";
import { createGetCategoryQuery, createGetThreadsQuery, createThreadQuery } from "../components/createQuery";
import pool from "../db/client";
import { Thread, thread_registration } from "../model/Threads";
import { user_login } from "../model/User";



export const ThreadRegistrationController = async(session_id: string, thread: thread_registration):Promise<boolean> => {
  

  let is_success = false;
  let client;
  try {
    //データベースに接続
    client = await pool.connect();
    console.log("connected");


    //セッションIDからユーザのカテゴリを取得し、thread.category_idと比較する
    //権限を持たない場合（例：一般ユーザなのに大学研究所のスレッドを作成しようとしている場合など）はエラーを返す
    const query_session:string = createGetCategoryQuery(session_id);
    console.log("sessionからカテゴリを取得するクエリ\n");
    console.log(query_session);
    const result_session = await client.query(query_session);

    console.log("sessionから取得したカテゴリ\n");
    console.log(result_session.rows[0].category_id);

    if (result_session.rows[0].category_id !== thread.category_id) {
      console.log("権限が一致しないため、スレッドの作成に失敗しました")
      throw new Error("権限がありません");
    }


    const query_createThread = createThreadQuery(thread);
    console.log("スレッドを作成するクエリ\n");
    console.log(query_createThread);
    const result = await client.query(query_createThread);



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