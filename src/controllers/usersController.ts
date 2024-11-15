import { create } from "domain";
import { createActivateQuery, createGetAllUsersQuery, createGetMyInfoQuery, createGetUserByEmailQuery, createLoginInfoQuery, createLoginQuery, createRegistrationQuery, createSearchUserQuery } from "../components/createQuery";
import { comparePassword, hashPassword } from "../components/hashUtils";
import pool from "../db/client";
import { mailInfo, user_login, user_registration } from "../model/User";
import { v4 as uuidv4 } from "uuid";


export const UserRegistrationController = async (user: user_registration): Promise<mailInfo> => {
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
    //send_emailクラスのインスタンスを作成
    const mI = new mailInfo(result.rows[0].id, user.email);
    return mI;
  } else {
    throw new Error("Error sending mail");
  }
  
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

//ユーザ認証のためのメールを再送信する
export const UserReSendMailController = async (id: string): Promise<mailInfo> => {
  let client;
  try {
    //データベースに接続
    client = await pool.connect();
    console.log("connected");

    //ユーザー情報を更新
    const query = createGetUserByEmailQuery();
    console.log(query);

    const result = await client.query(query, [id]);

    //1件なければエラーを返す
    if (result.rows.length === 1) {
      //
      if (result.rows[0].is_active) {
        throw new Error("ユーザがすでに認証されています");
      } else {
        const mI = new mailInfo(result.rows[0].id, result.rows[0].email);
        return mI;
      }
    } else {
      throw new Error("ユーザが存在しません");
    }

  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("なんらかのエラーが発生");
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

export const UserLoginController = async (email: string, password: string): Promise<user_login> => {
  //パスワードをハッシュ化
  const p = await hashPassword(password);

  //emailからpasswordとis_activeを取得するクエリを作成
  const query = createLoginQuery(email);

  let client;

  try {
    //データベースに接続
    client = await pool.connect();
    console.log("connected");
    const result = await client.query(query);
    console.log(await comparePassword(password, result.rows[0].password));
    console.log(result.rows[0].is_active);

    if (result.rows.length === 0) {//ユーザが見つからなかった場合
      throw new Error("emailが登録されていません");
    } else if (!result.rows[0].is_active) {//ユーザが認証されていない場合
      throw new Error("ユーザが認証されていません");
    } else if(await comparePassword(password, result.rows[0].password)) { //パスワードが一致した場合
      //result.rowsの中身の型を確認
      console.log(result.rows[0]);

      const user = new user_login(result.rows[0].id, result.rows[0].category_id);
      return user;
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

export const AllUsersGetController = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log("connected");

    const query = createGetAllUsersQuery();
    const result = await client.query(query);
    console.log("全ユーザ取得結果")
    console.dir(result, { depth: null });
    // `rows` と `rowCount` のみ抽出
    const simplifiedResult = {
      rowCount: result.rowCount,
      rows: result.rows
    };
    return simplifiedResult;
  } catch (error) {
    console.log(error);
    throw new Error("Error getting all users");
  } finally {
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
}

export const SearchUsersController = async (username: string) => {
  let client;

  try {
    client = await pool.connect();
    console.log("connected");

    const query = createSearchUserQuery();
    const result = await client.query(query, [username]);
    console.log("検索結果");
    console.dir(result, { depth: null });

    const simplifiedResult = {
      rowCount: result.rowCount,
      rows: result.rows
    };
    return simplifiedResult;
  } catch (err) {
    console.log(err);
    throw new Error("Error searching users");
  }
}

//自分のユーザ情報を取得する
export const MyInfoGetController = async (id: string) => {
  let client;
  try {
    client = await pool.connect();
    console.log("connected");

    const query = createGetMyInfoQuery();
    const result = await client.query(query, [id]);
    if(result.rows.length === 0) {
      throw new Error("ユーザが見つかりませんでした");
    } else {
      console.log(result.rows[0].user_name + "の情報");
      console.dir(result, { depth: null });
      return result.rows[0];
    }
    return result.rows[0];
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("Error getting my info");
    }
  }

}