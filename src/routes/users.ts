import express from "express";
import { user_registration } from "../model/User";
import { createActivateQuery, createLoginInfoQuery, createLoginQuery, createRegistrationQuery } from "../components/createQuery";
import client from "../db/client";
import { comparePassword, hashPassword } from "../components/hashUtils";

import { compare } from "bcrypt";
import pool from "../db/client";
import sendMail from "../components/sendMail";
import { create } from "domain";
import { UserLoginController, UserRegistrationController, UserValidationController} from "../controllers/usersController";


const router = express.Router();

router.get("/", (req, res) => {
  res.send("All users");
});

//ユーザー登録
router.post("/register", async(req, res) => {
  console.log("Registering user");
  console.log(req.body);
  const { name, first_name, last_name, category_id, institution, email, password } = req.body;

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

    const is_success = await UserRegistrationController(user);

    if (is_success) {
      res.status(200).send("ユーザ登録が完了しました");
    } else {
      res.status(400).send("ユーザ登録に失敗しました");
    }
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
    
    }
    //ステータスコード400とエラーメッセージを返す
    res.status(400).send("catch Error ユーザ登録に失敗しました"); 
  }


});

//http://localhost:8080/users/validate/?id=xxxx
router.post("/validate", async(req, res) => {
  console.log("Validating user");
  if(!req.query.id) {
    res.status(400).send("ID not found");
    return;
  } else if(typeof req.query.id !== "string") {
    res.status(400).send("Invalid ID");
    return;
  }
  const id = req.query.id;
  
  try {
    const is_success = await UserValidationController(id);

    console.log(is_success);
    if(is_success) {
      //ステータスコード200とメッセージを返す
      res.status(200).send("ユーザ認証が完了しました");
      return;
    }

    
  } catch (error) {
    console.log(error);
    //ステータスコード400とエラーメッセージを返す
    res.status(400).send("ユーザ認証に失敗しました");
  }
});

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

    const id = await UserLoginController(email, password);
    
    //UUIDが生成されているか確認
    if(!id) {
      res.status(400).send("UUIDが生成されていません");
      return;
    }

    //先ほど生成して、データベースに追加したUUIDをクッキーにセット
    res.cookie("session_id", id, {
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


export default router;