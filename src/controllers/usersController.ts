import { create } from "domain";
import { createActivateQuery, createGetAllUsersQuery, createGetMyInfoQuery, createGetTokenCategoryQuery, createGetUserByEmailQuery, createLoginInfoQuery, createLoginQuery, createRegistrationQuery, createSearchUserQuery } from "../components/createQuery";
import { comparePassword, hashPassword } from "../components/hashUtils";
import pool from "../db/client";
import { mailInfo, user_login, user_registration } from "../model/User";
import { v4 as uuidv4 } from "uuid";

//getTokenInfoControllerで取得したcategory_idとuser_idを返却するためのクラス
export class user_verify {
  constructor( user_id: string, category_id: string) {
    this.user_id = user_id;
    this.category_id = category_id;
  }
  user_id: string;
  category_id: string;
}

type profile_edit = {
  user_id: string;
  user_name?: string;
  first_name?: string;
  last_name?: string;
  category_id?: number;
  email?: string;
  password?: string;
  institution?: string;
}

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

export const ProfileEditController = async (profile: profile_edit): Promise<string> => {
  let client;
  try {
    client = await pool.connect();

    // 更新するフィールドを動的に構築
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let placeholderIndex = 1;

    if (profile.user_name) {
      console.log("put user_name");
      console.log(`user_name: ${profile.user_name}`);
      fieldsToUpdate.push(`user_name = $${placeholderIndex++}`);
      values.push(profile.user_name);
    }
    if (profile.first_name) {
      console.log("put first_name");
      console.log(`first_name: ${profile.first_name}`);
      fieldsToUpdate.push(`first_name = $${placeholderIndex++}`);
      values.push(profile.first_name);
    }
    //空の文字列でないとき
    if (profile.last_name) {
      console.log("put last_name");
      console.log(`last_name: ${profile.last_name}`);
      fieldsToUpdate.push(`last_name = $${placeholderIndex++}`);
      values.push(profile.last_name);
    }
    // if (category_id) {
    //   fieldsToUpdate.push(`category_id = $${placeholderIndex++}`);
    //   values.push(category_id);
    // }
    // if (email) {
    //   // メール変更の確認メール送信処理（仮）
    //   fieldsToUpdate.push(`email = $${placeholderIndex++}`);
    //   values.push(email);
    // }
    if (profile.password) {
      console.log("put password");
      console.log(`password: ${profile.password}`);
      //パスワードをハッシュ化
      const hashedPassword = await hashPassword(profile.password);
      fieldsToUpdate.push(`password = $${placeholderIndex++}`);
      values.push(hashedPassword);
    }
    //institutionがあるばあい undefinedはダメ
    if (profile.institution !== undefined) {
      console.log("put institution");
      console.log(`institution: ${profile.institution}`);
      fieldsToUpdate.push(`institution = $${placeholderIndex++}`);
      values.push(profile.institution);
    }

    if (fieldsToUpdate.length === 0) {
      throw new Error("アップデートする項目がありません");
    }

    // ユーザ情報の更新
    const query = `
      UPDATE users
      SET ${fieldsToUpdate.join(", ")}
      WHERE id = $${placeholderIndex}
      RETURNING *
    `;

    console.log(query);



    // トランザクション開始
    await client.query("BEGIN");

    //メール送信が必要ないプロフィールの更新
    await client.query(query, [...values, profile.user_id]);

    //emailまたはcategory_idの変更を伴う場合
    if (profile.category_id || profile.email) {

      //トークンの生成
      
      //クエリの作成
      
    }
    
    
    await client.query("COMMIT");

    return "temp";
    
  } catch (error) {
    console.log(error);
    throw new Error("Error editing profile");
  } finally {
    if (client) {
      //client.release();
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

export const UserValidationController = async (uv: user_verify): Promise<boolean> => {
  let check = false;

  let client;
  try {
    //データベースに接続
    client = await pool.connect();
    console.log("connected");

    let query;

    //uv.category_idの型を調べる
    console.log(typeof uv.category_id);


    if (String(uv.category_id) === "1") {
      console.log("ユーザの有効化");
      //ユーザ情報を更新
      query = createActivateQuery();
    } else if (String(uv.category_id) === "2" || String(uv.category_id) === "3") { //2または3の場合
      //一旦ここは保留

      query = "test";
    } else {
      throw new Error("カテゴリが不正です");
    }


    const result = await client.query(query, [uv.user_id]);
    console.dir(result, { depth: null });

    if(result.rowCount === 1) {
      check = true;
      return check;
    } else {
      throw new Error("ユーザの有効化に失敗しました");
    }
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

export const getTokenInfoController = async (token: string):Promise<user_verify> => {
  console.log("getTokenInfoController");
  let client;
  try {
    client = await pool.connect();
    console.log("connected");

    const query = createGetTokenCategoryQuery();
    const result = await client.query(query, [token]);
    console.log("トークン情報");
    console.dir(result, { depth: null });

    if (result.rows.length === 0) {
      throw new Error("トークンが見つかりませんでした");
    } else {
      if (result.rows[0].expires_at < new Date()) {
        throw new Error("トークンの有効期限が切れています");
      } else {
        console.log(result.rows[0].category_id);
        //user_verifyクラスのインスタンスを作成
        const uv = new user_verify(result.rows[0].user_id, result.rows[0].category_id);
        return uv;
      }
    }
  } catch (error) {
    console.log(error);
    throw new Error("Error getting token info");
  } finally {
    if (client) {
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