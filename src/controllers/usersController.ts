import { createActivateQuery, createLoginInfoQuery, createLoginQuery, createRegistrationQuery } from "../components/createQuery";
import { comparePassword, hashPassword } from "../components/hashUtils";
import sendMail from "../components/sendMail";
import pool from "../db/client";
import { user_registration } from "../model/User";
import { v4 as uuidv4 } from "uuid";


export const UserRegistrationController = async (user: user_registration): Promise<boolean> => {
  console.log("User Registration Controller");
  let check = false;

  //ユーザー情報を登録するクエリを作成
  const query: string = createRegistrationQuery(user);
  console.log(query);

  let client;
  try {
    //データベースに接続
  client = await pool.connect();
  console.log("connected");

  //ユーザー情報をデータベースに登録
  const result = await client.query(query);
  console.log(result);
  console.log("id:" + result.rows[0].id)

  //result.rows[0].idがあればメールを送信
  // sendMail(email, result.rows[0].id);
  if (result.rows[0].id != undefined) {
    await sendMail(user.email, result.rows[0].id);
  } else {
    throw new Error("Error sending mail");
  }

  check = true;
  return check;
  
  } catch(err) {
    //console.log(err);
    if (err instanceof Error) {
      throw new Error(err.message);
    } else {
      throw new Error("Error registering user");
    }

    
    
  } finally {
    //データベースとの接続を切断
    if(client) {
      client.release();
    }
    console.log("disconnected\n");
  }
  
}

export const UserValidationController = async (id: string): Promise<boolean> => {
  let check = false;

  let client;
  try {
    //データベースに接続
    client = await pool.connect();
    console.log("connected");

    //ユーザー情報を更新
    const query = createActivateQuery(id);
    console.log(query);

    const result = await client.query(query);

    check = true;
    return check;
  } catch (error) {
    console.log(error);
    throw new Error("Error validating user");
  } finally {
    //データベースとの接続を切断
    if(client) {
      client.release();
    }
    console.log("disconnected\n");
  }
}

export const UserLoginController = async (email: string, password: string): Promise<string> => {
  //パスワードをハッシュ化
  const p = await hashPassword(password);

  const query = createLoginQuery(email);

  let client;

  try {
    //データベースに接続
    client = await pool.connect();
    console.log("connected");
    const result = await client.query(query);
    console.log(await comparePassword(password, result.rows[0].password));

    if (result.rows.length === 0) {//ユーザが見つからなかった場合
      throw new Error("User not found");
    } else if(await comparePassword(password, result.rows[0].password)) { //パスワードが一致した場合
      console.log("ユーザーが見つかりました");

      //UUIDの生成
      const id = uuidv4();
      //古いログイン情報を削除し、新しいログイン情報を追加
      const query = createLoginInfoQuery(id, email);

      const result = await client.query(query);
      console.log(result);

      return id;
    } else {
      throw new Error("パスワードが一致しません");
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "パスワードが一致しません") {
        throw new Error("パスワードが一致しません");
      } else if (error.message === "User not found") {
        throw new Error("認証済みのユーザが見つかりませんでした");
      } else {
        throw new Error(error.message);
      }
    } else {
      throw new Error("Error logging in user");
    }
  } finally {
    //データベースとの接続を切断
    if(client) {
      client.release();
    }
    console.log("disconnected\n");
  }
}