import { create } from "domain";
import {
  createActivateQuery,
  createDeletePendingUserChangesQuery,
  createGetAllUsersQuery,
  createGetMyInfoQuery,
  createGetPendingUserChangesQuery,
  createGetTokenCategoryQuery,
  createGetUserByEmailQuery,
  createLoginInfoQuery,
  createLoginQuery,
  createRegistrationQuery,
  createSearchUserQuery,
  createUpdateUserQuery,
  createGetChangesByUserIdQuery,
  createUpdatePendingUserChangesQuery,
  createInsertPasswordResetTokenQuery,
} from "../components/createQuery";
import { comparePassword, hashPassword } from "../components/hashUtils";
import pool from "../db/client";
import { mailInfo, user_login, user_registration } from "../model/User";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { sendMail } from "../components/sendMail";
import { TokenExpiredError } from "jsonwebtoken";
import { convertUtcToJst } from "../components/timeUtils";

//getTokenInfoControllerで取得したcategory_idとuser_idを返却するためのクラス
export class user_verify {
  constructor(user_id: string, category_id: string) {
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
};

export const UserRegistrationController = async (
  user: user_registration
): Promise<mailInfo> => {
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
    console.log("id:" + result.rows[0].id);

    //result.rows[0].idがあればメールを送信
    // sendMail(email, result.rows[0].id);
    if (result.rows[0].id != undefined) {
      //send_emailクラスのインスタンスを作成
      const mI = new mailInfo(result.rows[0].id, user.email);
      return mI;
    } else {
      throw new Error("Error sending mail");
    }
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
};

export const ProfileEditController = async (
  profile: profile_edit
): Promise<boolean> => {
  console.log("Profile Edit Controller");
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

    //fieldsToUpdateが空かつ、category_idとemailが空の場合
    if (fieldsToUpdate.length === 0 && !profile.category_id && !profile.email) {
      console.log(`アップデート項目なし userController`);
      console.log(`fieldsToUpdate: ${fieldsToUpdate}`);
      console.log(`category_id: ${profile.category_id}`);
      console.log(`email: ${profile.email}`);
      throw new Error("アップデートする項目がありません");
    }

    // ユーザ情報の更新
    const query_update = `
      UPDATE users
      SET ${fieldsToUpdate.join(", ")}
      WHERE id = $${placeholderIndex}
      RETURNING *
    `;

    console.log(query_update);

    // トランザクション開始
    await client.query("BEGIN");

    //メール送信が必要ないプロフィールの更新（fieldsToUpdateがあるとき）
    if (fieldsToUpdate.length > 0) {
      //クエリの実行
      const result = await client.query(query_update, [
        ...values,
        profile.user_id,
      ]);
      if (result.rowCount === 0) {
        throw new Error("プロフィールの変更ができませんでした");
      }
      console.log("result");
    }

    console.log(`category_id ${profile.category_id}`);
    //category_idがundefinedでない場合
    if (profile.category_id) {
      console.log("category_idがある");
      // 有効期限を1日後に設定
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      //日本時間に変換
      const expires_at_jst = convertUtcToJst(expiresAt);
      //クエリの作成
      //emailとcategory_idの変更はメール認証後なので、いったんpending_user_changesに保存しておく
      //まずはcategory_idの変更がある場合
      let query_pending_category;
      if (profile.category_id) {
        console.log("変更:category_id");
        // トークンの生成
        const token = crypto.randomBytes(32).toString("hex");
        query_pending_category = `
        INSERT INTO pending_user_changes (user_id, field_name, new_value, token, is_verified, expires_at)
        SELECT $1, 'category_id', $2, $3, $4, $5
        WHERE NOT EXISTS (
            SELECT 1
            FROM pending_user_changes
            WHERE user_id = $6 AND field_name = 'category_id'
        );
        `;

        //クエリの実行
        const result = await client.query(query_pending_category, [
          profile.user_id,
          profile.category_id,
          token,
          false,
          expires_at_jst,
          profile.user_id,
        ]);

        //pending_user_changesに挿入できなかった場合
        if (result.rowCount === 0) {
          throw new Error("現在カテゴリの変更が保留されています");
        }

        console.log("カテゴリID変更のメール送信");
        //profile.emailがある場合
        if (profile.email) {
          await sendMail(profile.email, token, 2);
        } else {
          //emailがない場合
          throw new Error("emailが指定されていません");
        }

        return true;
      }
    }

    console.log(`email ${profile.email}`);
    //カテゴリIDの変更がない場合
    if (profile.email) {
      //カテゴリIDの変更がある場合
      if (profile.category_id) {
        throw new Error("カテゴリIDとemailの変更は同時にできません");
      }
      // 有効期限を1日後に設定
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);
      //日本時間に変換
      const expires_at_jst = convertUtcToJst(expiresAt);
      //クエリの作成
      //emailとcategory_idの変更はメール認証後なので、いったんpending_user_changesに保存しておく
      //まずはcategory_idの変更がある場合
      let query_pending_email;
      if (profile.email) {
        console.log("変更:email");
        // トークンの生成
        const token = crypto.randomBytes(32).toString("hex");
        query_pending_email = `
        INSERT INTO pending_user_changes (user_id, field_name, new_value, token, is_verified, expires_at)
        SELECT $1, 'email', $2, $3, $4, $5
        WHERE NOT EXISTS (
            SELECT 1
            FROM pending_user_changes
            WHERE user_id = $6 AND field_name = 'email'
        );
        `;

        //クエリの実行
        const result = await client.query(query_pending_email, [
          profile.user_id,
          profile.email,
          token,
          false,
          expires_at_jst,
          profile.user_id,
        ]);

        //pending_user_changesに挿入できなかった場合
        if (result.rowCount === 0) {
          throw new Error("現在メールアドレスの変更が保留されています");
        }

        console.log("メールアドレス変更のメール送信");
        //profile.emailがある場合(新しいメールアドレス)
        if (profile.email) {
          await sendMail(profile.email, token, 3);
        } else {
          //emailがない場合
          throw new Error("emailが指定されていません");
        }
      }
    }

    await client.query("COMMIT");

    return true;
  } catch (error) {
    console.log(error);
    if (client) {
      await client.query("ROLLBACK");
    }
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("Error editing profile");
    }
  } finally {
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
};

//ユーザ認証のためのメールを再送信する
export const UserReSendMailController = async (
  id: string
): Promise<mailInfo> => {
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
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
};

//メールアドレス変更のためのメールを再送信する
export const ProfileReSendMailController = async (
  id: string,
  field_name: string
): Promise<string> => {
  let client;
  try {
    //データベースに接続
    client = await pool.connect();
    //トランザクション開始
    await client.query("BEGIN");
    console.log("connected");

    //ユーザー情報を更新
    const query = createGetChangesByUserIdQuery(field_name);
    console.log(query);

    const result = await client.query(query, [id]);

    //1件なければエラーを返す
    if (result.rows.length === 0) {
      throw new Error("認証待ちの変更はありません");
    } else {
      //last_sent_atから5分以上経っているかどうか
      const last_sent_at = result.rows[0].last_sent_at;
      const now = new Date();
      //nowをJSTに変換
      const now_jst = convertUtcToJst(now);

      //now_jstをDate型に変換
      const now_jst_date = new Date(now_jst);

      const diff = now_jst_date.getTime() - last_sent_at.getTime();
      console.log(diff);
      if (diff < 300000) {
        throw new Error("再送信から5分以内は再送信できません");
      }
    }

    // 有効期限を1日後に設定
    const expiresAt = new Date();
    const expires_at_jst = convertUtcToJst(expiresAt);
    //expires_at_jstをDate型に変換
    const expires_at_jst_date = new Date(expires_at_jst);
    //expires_at_jst_dateを1日後に設定
    expires_at_jst_date.setDate(expires_at_jst_date.getDate() + 1);

    //last_sent_atを更新
    const last_sent_at = new Date();
    const last_sent_at_jst = convertUtcToJst(last_sent_at);
    //last_sent_at_jstをDate型に変換
    const last_sent_at_jst_date = new Date(last_sent_at_jst);
    //last_sent_at_jst_dateを現在時刻に設定
    last_sent_at_jst_date.setDate(last_sent_at_jst_date.getDate());

    //有効期限とlast_sent_atを更新するクエリの作成
    const query_update = createUpdatePendingUserChangesQuery();
    console.log(query_update);
    //クエリの実行
    const result_update = await client.query(query_update, [
      expires_at_jst_date,
      last_sent_at_jst_date,
      result.rows[0].id,
    ]);

    //更新できなかった場合
    if (result_update.rowCount === 0) {
      throw new Error("情報の更新に失敗しました");
    }

    //result.rows[0].tokenをstring型に変換
    const token = String(result.rows[0].token);
    return token;
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("なんらかのエラーが発生");
    }
  } finally {
    //データベースとの接続を切断
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
};

//パスワードのリセット要求があるか確認（pending_user_changesからuser_idで検索）して、なかったら作成、あったらlast_sent_atを更新
export const PasswordResetRequestController = async (
  user_id: string
): Promise<string> => {
  let client;
  try {
    //データベースに接続
    client = await pool.connect();
    //トランザクション開始
    await client.query("BEGIN");
    console.log("connected");

    //すでに要求が存在するか検索
    const query = createGetChangesByUserIdQuery("password");
    console.log(query);

    const result = await client.query(query, [user_id]);

    let token_sent;
    if (result.rowCount === 0) {
      console.log("パスワードリセット pending_user_changesに保存");
      // 有効期限を1日後に設定
      const expiresAt = new Date();
      const expires_at_jst = convertUtcToJst(expiresAt);
      //expires_at_jstをDate型に変換
      const expires_at_jst_date = new Date(expires_at_jst);
      //expires_at_jst_dateを1日後に設定
      expires_at_jst_date.setDate(expires_at_jst_date.getDate() + 1);

      // トークンの生成
      const token_ = crypto.randomBytes(32).toString("hex");
      //last_sent_atを更新
      const last_sent_at = new Date();
      const last_sent_at_jst = convertUtcToJst(last_sent_at);

      //last_sent_at_jstをDate型に変換
      const last_sent_at_jst_date = new Date(last_sent_at_jst);
      last_sent_at_jst_date.setDate(last_sent_at_jst_date.getDate());
      //クエリの作成
      //new_valueはパスワードの時はtmpでいい レコードをトークンの保存として使うだけなので
      const query_pending_password = createInsertPasswordResetTokenQuery();
      console.log(`user_id: ${user_id}`);
      console.log(`token: ${token_}`);
      console.log(`expiresAt: ${expiresAt}`);
      console.log(`last_sent_at: ${last_sent_at}`);

      console.log(query_pending_password);
      //クエリの実行
      const result_pending_password = await client.query(
        query_pending_password,
        [user_id, token_, last_sent_at_jst_date, expires_at_jst_date]
      );

      //挿入できなかった場合
      if (result_pending_password.rowCount === 0) {
        throw new Error("情報の挿入に失敗しました");
      } else {
        console.log("パスワードリセットのメール送信");
        token_sent = token_;
      }
    } else {
      //last_sent_atから5分以上経っているかどうか確認して、立っていなかったらエラー
      const last_sent_at_get = result.rows[0].last_sent_at;
      const now = new Date();
      //nowをJSTに変換
      const now_jst = convertUtcToJst(now);
      //now_jstをDate型に変換
      const now_jst_date = new Date(now_jst);
      const diff = now_jst_date.getTime() - last_sent_at_get.getTime();
      console.log(diff);
      if (diff < 300000) {
        throw new Error("再送信から5分以内は再送信できません");
      }

      //last_sent_atを更新
      const last_sent_at = new Date();
      const last_sent_at_jst = convertUtcToJst(last_sent_at);
      //last_sent_at_jstをDate型に変換
      const last_sent_at_jst_date = new Date(last_sent_at_jst);
      last_sent_at_jst_date.setDate(last_sent_at_jst_date.get);
      //クエリの作成
      const query_update = createUpdatePendingUserChangesQuery();
      console.log(query_update);
      //クエリの実行
      const result_update = await client.query(query_update, [
        result.rows[0].expires_at,
        last_sent_at,
        result.rows[0].id,
      ]);

      //更新できなかった場合
      if (result_update.rowCount === 0) {
        throw new Error("情報の更新に失敗しました");
      } else {
        console.log("パスワードリセットのメール再送信");
        token_sent = result.rows[0].token;
      }
    }

    //commit
    await client.query("COMMIT");

    //result.rows[0].tokenをstring型に変換
    const token_sent_ = String(token_sent);

    return token_sent_;
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("なんらかのエラーが発生");
    }
  } finally {
    //データベースとの接続を切断
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
};

//ユーザの有効化
export const UserValidationController = async (
  uv: user_verify
): Promise<boolean> => {
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
    } else if (
      String(uv.category_id) === "2" ||
      String(uv.category_id) === "3" ||
      String(uv.category_id) === "4"
    ) {
      //2または3の場合
      //一旦ここは保留
      throw new Error("送るエンドポイントが違います");
      query = "test";
    } else {
      throw new Error("カテゴリが不正です");
    }

    const result = await client.query(query, [uv.user_id]);
    console.dir(result, { depth: null });

    if (result.rowCount === 1) {
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
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
};

//プロフィール編集の有効化
export const ProfileValidationController = async (token: string) => {
  let client;
  try {
    client = await pool.connect();
    //トランザクション開始
    await client.query("BEGIN");
    console.log("connected");

    //pending_user_changesからtokenで検索するクエリを作成
    const query = createGetPendingUserChangesQuery();

    const result = await client.query(query, [token]);

    console.dir(result, { depth: null });

    console.log(result.rows[0]);

    if (result.rows.length === 0) {
      throw new Error("トークンが見つかりませんでした");
    }

    const date = new Date();
    //dateをJSTに変換
    const date_jst = convertUtcToJst(date);
    if (result.rows[0].expires_at < date_jst) {
      throw new Error("トークンの有効期限が切れています");
    }

    const query_update = createUpdateUserQuery(result.rows[0].field_name);
    console.log(query_update);

    const result_update = await client.query(query_update, [
      result.rows[0].new_value,
      result.rows[0].user_id,
    ]);

    if (result_update.rowCount === 0) {
      throw new Error("プロフィールの変更ができませんでした");
    }

    //pending_user_changesから削除
    const query_pending_delete = createDeletePendingUserChangesQuery();
    const result_delete = await client.query(query_pending_delete, [
      result.rows[0].id,
    ]);

    if (result_delete.rowCount === 0) {
      throw new Error("トークンの削除ができませんでした");
    }

    await client.query("COMMIT");
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("Error validating profile");
    }
  } finally {
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
};

export const getTokenInfoController = async (
  token: string
): Promise<user_verify> => {
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
      const date = new Date();
      //dateをJSTに変換
      const date_jst = convertUtcToJst(date);
      if (result.rows[0].expires_at < date_jst) {
        throw new Error("トークンの有効期限が切れています");
      } else {
        console.log(result.rows[0].category_id);
        //user_verifyクラスのインスタンスを作成
        const uv = new user_verify(
          result.rows[0].user_id,
          result.rows[0].category_id
        );
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
};

export const UserLoginController = async (
  email: string,
  password: string
): Promise<user_login> => {
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

    if (result.rows.length === 0) {
      //ユーザが見つからなかった場合
      throw new Error("emailが登録されていません");
    } else if (!result.rows[0].is_active) {
      //ユーザが認証されていない場合
      throw new Error("ユーザが認証されていません");
    } else if (await comparePassword(password, result.rows[0].password)) {
      //パスワードが一致した場合
      //result.rowsの中身の型を確認
      console.log(result.rows[0]);

      const user = new user_login(
        result.rows[0].id,
        result.rows[0].category_id
      );
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
    if (client) {
      client.release();
    }
    console.log("disconnected\n");
  }
};

export const AllUsersGetController = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log("connected");

    const query = createGetAllUsersQuery();
    const result = await client.query(query);
    console.log("全ユーザ取得結果");
    console.dir(result, { depth: null });
    // `rows` と `rowCount` のみ抽出
    const simplifiedResult = {
      rowCount: result.rowCount,
      rows: result.rows,
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
};

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
      rows: result.rows,
    };
    return simplifiedResult;
  } catch (err) {
    console.log(err);
    throw new Error("Error searching users");
  }
};

//自分のユーザ情報を取得する
export const MyInfoGetController = async (id: string) => {
  let client;
  try {
    client = await pool.connect();
    console.log("connected");

    const query = createGetMyInfoQuery();
    const result = await client.query(query, [id]);
    if (result.rows.length === 0) {
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
};
