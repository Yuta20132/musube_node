import express from "express";
import { user_registration } from "../model/User";
import { createLoginInfoQuery, createLoginQuery, createRegistrationQuery } from "../components/createQuery";
import client from "../db/client";
import { comparePassword, hashPassword } from "../components/hashUtils";
import { v4 as uuidv4 } from "uuid";
import { compare } from "bcrypt";
import pool from "../db/client";
import sendMail from "../components/sendMail";


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

  let client;
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

    //ユーザー情報を登録するクエリを作成
    const query: string = createRegistrationQuery(user);

    console.log(query);

    //データベースに接続
    client = await pool.connect();
    console.log("connected")

    //ユーザー情報をデータベースに登録
    const result = await client.query(query);
    console.log(result.rows[0])

    //メールを送信
    sendMail(email);

    //ステータスコード200とメッセージを返す
    res.status(200).send("User registered");
  } catch (error) {
    console.log(error instanceof Error);
    if (error instanceof Error) {
      console.log(error.message);
      if(error.message.includes("unique_user_name")) {
        res.status(400).send("User name already exists");
        return;
      } else if(error.message.includes("unique_email")) {
        res.status(400).send("Email already exists");
        return;
      }
    
    }
    //ステータスコード400とエラーメッセージを返す
    res.status(400).send("Error registering user");
  } finally {
    //データベースとの接続を切断
    if(client) {
      client.release();
    }
    console.log("disconnected\n");
  }


});

router.post("/login", async(req, res) => {
  console.log("Logging in user");
  try {
    const { email, password } = req.body;

    //パスワードをハッシュ化
    const p = await hashPassword(password);

    const query = createLoginQuery(email);
    //データベースに接続
    await client.connect();
    console.log("connected")
    const result = await client.query(query);
    console.log(await comparePassword(password, result.rows[0].password));
    if (result.rows.length === 0) {
      res.send("User not found");
      return;
    } else if(await comparePassword(password, result.rows[0].password)) {
      console.log("ユーザーが見つかりました");
      //UUIDの生成
      const id = uuidv4();
      //古いログイン情報を削除し、新しいログイン情報を追加
      const query = createLoginInfoQuery(id, email);

      console.log(query);

      const result = await client.query(query);

      res.cookie("session_id", id, {
        httpOnly: true, //クライアント側のJavaScriptからはアクセスできない
        secure: true, //HTTPS通信の場合のみ送信
        sameSite: 'strict', //クロスサイトリクエストの場合には送信しない
        maxAge: 1000 * 60 * 60 * 1000, //24時間有効
      });
      
    } else {

    }
  } catch (error) {
    console.log(error);
    res.send("Error logging in user");
  } finally {
    //データベースとの接続を切断
    await client.end();
    res.send("Login successful And cookie set");
  }


})


export default router;