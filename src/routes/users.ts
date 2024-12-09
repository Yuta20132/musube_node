import express from "express";
import {  user_login, user_registration } from "../model/User";
import { createActivateQuery, createLoginInfoQuery, createLoginQuery, createRegistrationQuery } from "../components/createQuery";
import client from "../db/client";
import { comparePassword, hashPassword } from "../components/hashUtils";

import { compare } from "bcrypt";
import pool from "../db/client";
import  { sendMail, createVerificationToken } from "../components/sendMail";
import { create } from "domain";
import { AllUsersGetController, getTokenInfoController, MyInfoGetController, ProfileEditController, SearchUsersController, user_verify, UserLoginController, UserRegistrationController, UserReSendMailController, UserValidationController} from "../controllers/usersController";
import { generateJWT, getPayloadFromJWT, verifyJWT } from "../components/jwt";
import { profile } from "console";

// 型定義
type ProfileEditRequestBody = {
  user_name?: string;
  first_name?: string;
  last_name?: string;
  category_id?: number;
  email?: string;
  password?: string;
  institution?: string;
};

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


const router = express.Router();

router.get("/", async (req, res) => {
  console.log("全ユーザの取得");

  //トークンがあるか確認
  const token = req.cookies.bulletin_token;
  if (token === undefined) {
    res.status(400).send("トークンがありません");
    return;
  }

  //トークンの検証
  if (!verifyJWT(token)) {
    res.status(400).send("トークンが無効です");
    return;
  }

  //トークンから情報を取得
  const payload = getPayloadFromJWT(token);
  if (payload === null) {
    res.status(400).send("トークンの解析に失敗しました");
    return;
  }


  //payloadにあるユーザのcategory_idが5（管理者）でない場合はエラーを返す
  if (payload.category_id !== "5") {
    res.status(400).send("権限がありません");
    return;
  }

  try {
    const users = await AllUsersGetController();
    res.status(200).send(users);
  } catch (err) {
    console.log(err);
    res.status(400).send("ユーザの取得に失敗しました");
  }
});

//GET users/search?username=johndoe
router.get("/search", async(req, res) => {
  console.log("ユーザ検索");

  //トークンがあるか確認
  const token = req.cookies.bulletin_token;
  if (token === undefined) {
    res.status(400).send("トークンがありません");
    return;
  }

  //トークンの検証
  if (!verifyJWT(token)) {
    res.status(400).send("トークンが無効です");
    return;
  }

  //トークンから情報を取得
  const payload = getPayloadFromJWT(token);
  if (payload === null) {
    res.status(400).send("トークンの解析に失敗しました");
    return;
  }

  //usernameがない場合はエラーを返す
  if(!req.query.username) {
    res.status(400).send("usernameがありません");
    return;
  }

  // クエリパラメータから `username` を取得後、文字列に変換
  const username = String(req.query.username);

  try {
    const users = await SearchUsersController(username);

    res.status(200).send(users);
  } catch (err) {
    console.log(err);
    res.status(400).send("ユーザの取得に失敗しました");
  }
});

//GET /users/me
router.get("/me", async(req, res) => {
  console.log("自分のユーザ情報を取得");

  //トークンがあるか確認
  const token = req.cookies.bulletin_token;
  if (token === undefined) {
    res.status(400).send("トークンがありません");
    return;
  }

  //トークンの検証
  if (!verifyJWT(token)) {
    res.status(400).send("トークンが無効です");
    return;
  }

  //トークンから情報を取得
  const payload = getPayloadFromJWT(token);
  if (payload === null) {
    res.status(400).send("トークンの解析に失敗しました");
    return;
  }

  try {
    const user = await MyInfoGetController(payload.user_id);
    res.status(200).send(user);
  } catch (err) {
    console.log(err);
    res.status(400).send("ユーザの取得に失敗しました");
  }
});

//ユーザー登録
router.post("/register", async(req, res) => {
  console.log("Registering user");
  console.log(req.body);
  const { name, first_name, last_name, category_id, institution, email, password } = req.body;

  //category_idが5のユーザー（管理者）は、APIからの登録はできないようにする
  if(category_id === 5) {
    res.status(400).send("管理者ユーザを登録することはできません");
    return;
  }
  
  //category_idが大学研究所(2)の場合、emailの下5桁がac.jpであるか確認
  if(category_id === 2 && email.slice(-5) !== "ac.jp") {
    res.status(400).send("無効なメールアドレスです");
    return;
  }

  try {
    //パスワードをハッシュ化
    const hashedPassword = await hashPassword(password);

    //ユーザー情報を作成
    const user: user_registration = {
      user_name: name,
      first_name: first_name,
      last_name: last_name,
      category_id: category_id,
      institution: institution,
      email: email,
      password: hashedPassword
    }

    const  mailInfo = await UserRegistrationController(user);

    //トークンの生成
    const token = await createVerificationToken(mailInfo.id, 1);

    //メール送信
    await sendMail(mailInfo.email, token);

    //ステータスコード200とメッセージを返す
    res.status(200).send("仮登録完了");
    
  } catch (error) {
    console.log(error);
    console.log(error instanceof Error);
    if (error instanceof Error) {
      console.log(error.message);
      if(error.message.includes("unique_user_name")) {
        res.status(400).send("ユーザ名が登録されています");
        return;
      } else if(error.message.includes("unique_email")) {
        res.status(400).send("すでに登録されたメールアドレスです");
        return;
      }
    
    } else {
      res.status(400).send(error);
    }
    //ステータスコード400とエラーメッセージを返す
    res.status(400).send("catch Error ユーザ登録に失敗しました"); 
  }


});

//ユーザ情報の更新
router.put("/", async(req, res) => {
  const token = req.cookies.bulletin_token;
  if (token === undefined) {
    res.status(400).send("トークンがありません");
    return;
  }
  //トークンの検証
  if (!verifyJWT(token)) {
    res.status(400).send("トークンが無効です");
    return;
  }
  //トークンから情報を取得
  const payload = getPayloadFromJWT(token);
  if (payload === null) {
    res.status(400).send("トークンの解析に失敗しました");
    return;
  }

  console.log("ユーザ情報の更新を開始");

  // リクエストボディから更新項目を取得
  const { user_name, first_name, last_name, category_id, email, password, institution } = req.body;

  //ボディになんの情報もない場合はエラーを返す
  if (!user_name && !first_name && !last_name && !category_id && !email && !password && !institution) {
    res.status(400).send("更新する情報がありません");
    return;
  }

  

  try {
    const profile: profile_edit = {
      user_id: payload.user_id,
      ...(user_name && { user_name }),
      ...(first_name && { first_name }),
      ...(last_name && { last_name }),
      ...(category_id && { category_id }),
      ...(email && { email }),
      ...(password && { password }),
      ...(institution && { institution }),
      // user_name: String(user_name) || "" ,// nullならば空の文字列にする
      // first_name: String(first_name) || "", //nullならば空の文字列にする
      // last_name: String(last_name) || "", //nullならば空の文字列にする
      // category_id: Number(category_id) || 0, //nullならば0にする
      // institution: String(institution) || "", //nullならば空の文字列にする
      // email: String(email) || "", //nullならば空の文字列にする
      // password: String(password) || "" //nullならば空の文字列にする
    }

    let token;
    //emailまたは所属が入力されている場合、トークンの生成を行う
    // if(profile.email || profile.institution) {
    //   token = await createVerificationToken(payload.user_id, 1);
    // }

    await ProfileEditController(profile);


    res.status(200).send("ユーザ情報の更新が完了しました");
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      res.status(400).send(error.message);
    } else {
      res.status(400).send(error);
    }
  }


});

//登録確認メールの再送信
router.get("/register_resend", async(req, res) => {

  //トークンがあるか確認
  const token = req.cookies.bulletin_token;
  if (token === undefined) {
    res.status(400).send("トークンがありません");
    return;
  }

  //トークンの検証
  if (!verifyJWT(token)) {
    res.status(400).send("トークンが無効です");
    return;
  }


  console.log("resend Mail when registering");
  console.log(req.body);

  //emailがない場合はエラーを返す
  if(!req.body.email) {
    res.status(400).send("emailがありません");
    return;
  }

  //emailが文字列であるか確認
  if(typeof req.body.email !== "string") {
    res.status(400).send("emailが文字列ではありません");
    return;
  }

  const email = req.body.email;

  try {
    //一次的なやつ
    const mailInfo = await UserReSendMailController(email);

    //トークンの生成
    const token = await createVerificationToken(mailInfo.id, 1);

    //メール送信
    await sendMail(email, token);

    //ステータスコード200とメッセージを返す
    res.status(200).send("メールを再送信しました");
    
  } catch (error) {
    console.log(error);
    console.log(error instanceof Error);
    if (error instanceof Error) {
      console.log(error.message);
      res.status(400).send(error.message);
    } else {
      res.status(400).send(error);
    }
    
  }
});

//プロフィール編集の際のメールの再送信
//未実装
router.post("/profile_resend", async(req, res) => {
 
})


//http://localhost:8080/users/verify
//メール認証
//未実装
router.post("/verify", async(req, res) => {
  console.log("メール認証");

  let token;
  console.log(req.body.token);

  //tokenがリクエストボディにあれば取得
  if (!req.body.token) {
    res.status(400).send("トークンがありません");
    return;
  } else {
    if (typeof req.body.token !== "string") {
      res.status(400).send("トークンが文字列ではありません");
      return;
    } else {
      token = String(req.body.token);
    }
  }
  
  try {
    //トークンを検証
    console.log("token:" + token);
    const uv: user_verify = await getTokenInfoController(token);

    const is_success = await UserValidationController(uv);

    console.log(is_success);
    if(is_success) {
      console.log("ユーザ認証完了");
      //ステータスコード200とメッセージを返す
      res.status(200).send("ユーザ認証が完了しました");
      return;
    } else {
      res.status(400).send("ユーザ認証に失敗しました");
      return;
    }

    
  } catch (error) {
    console.log(error);
    //ステータスコード400とエラーメッセージを返す
    res.status(400).send("ユーザ認証に失敗しました");
  }
});

//ログイン
router.post("/login", async(req, res) => {
  console.log("Logging in user");
  try {
    const { email, password } = req.body;

    //emailとpasswordが存在するか確認
    if (!email || !password) {
      res.status(400).send("emailまたはパスワードが存在しません");
      return;
    }

    //emailとpasswordが文字列であるか確認
    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).send("emailまたはパスワードが文字列ではありません");
      return;
    }

    //ユーザー情報を取得
    const user: user_login = await UserLoginController(email, password);
    
    //JWTトークンを生成
    const token = generateJWT({
      user_id: user.user_id,
      category_id: user.category_id,
    });

    //クッキーにトークンをセット
    res.cookie("bulletin_token", token, {
      httpOnly: true, //クライアント側のJavaScriptからはアクセスできない
      secure: true, //HTTPS通信の場合のみ送信
      sameSite: 'strict', //クロスサイトリクエストの場合には送信しない
      maxAge: 1000 * 60 * 60 * 1000, //24時間有効
    });
      
    res.status(200).send("ログインに成功しました");
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      res.status(400).send(error.message);
    }
  } 

})

//JWTトークンの確認用の一時的なエンドポイント
// router.get("/check", async(req, res) => {
//   //クッキーからトークンを取得
//   const token = req.cookies.bulletin_token;
//   //トークンがない場合はエラーを返す
//   if (!token) {
//     res.status(400).send("トークンがありません");
//     return;
//   }

//   //トークンを検証
//   try {
//     if(!verifyJWT(token)) {
//       res.status(400).send("トークンが無効です");
//       return;
//     } else {
//       const payload = getPayloadFromJWT(token);
//       res.status(200).send(payload);
//     }
//   } catch (error) {
//     if (error instanceof Error) {
//       console.log(error.message)
//     }
//   }

// });

//ログアウト
router.post("/logout", async(req, res) => {
  //クッキーからトークンを取得
  const token = req.cookies.bulletin_token;
  //トークンがない場合はエラーを返す
  if (!token) {
    res.status(400).send("トークンがありません");
    return;
  }

  //トークンを削除
  res.clearCookie("bulletin_token");
  res.status(200).send("ログアウトしました");

});


export default router;