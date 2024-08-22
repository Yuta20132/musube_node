import express from "express";
import { user_registration } from "../model/User";
import { createLoginInfoQuery, createLoginQuery, createRegistrationQuery } from "../components/createQuery";
import client from "../db/client";
import { hashPassword } from "../components/hashUtils";
import { v4 as uuidv4 } from "uuid";


const router = express.Router();

router.get("/", (req, res) => {
  res.send("All users");
});

//ユーザー登録
router.post("/", async(req, res) => {
  console.log("Registering user");
  console.log(req.body);
  const { user_name, first_name, last_name, category_id, email, password } = req.body;

  try {
    //パスワードをハッシュ化
    const hasyPassword = await hashPassword(password);

    //ユーザー情報を作成
    const user: user_registration = {
      user_name: user_name,
      first_name: first_name,
      last_name: last_name,
      category_id: category_id,
      email: email,
      password: hasyPassword
    }

    //ユーザー情報を登録するクエリを作成
    const query: string = createRegistrationQuery(user);

    console.log(query);

    //データベースに接続
    await client.connect();
    console.log("connected")

    //ユーザー情報をデータベースに登録
    const result = await client.query(query);
    console.log(result.rows[0])
    res.send("User registered");
  } catch (error) {
    console.log(error);
    res.send("Error registering user");
  } finally {
    //データベースとの接続を切断
    await client.end();
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

    if (result.rows.length === 0) {
      res.send("User not found");
      return;
    } else if(result.rows[0].password === p) {
      //UUIDの生成
      const id = uuidv4();
      //古いログイン情報を削除し、新しいログイン情報を追加
      const query = createLoginInfoQuery(id, email);

      const result = await client.query(query);

      res.cookie("session_id", id, {
        httpOnly: true, //クライアント側のJavaScriptからはアクセスできない
        secure: true, //HTTPS通信の場合のみ送信
        sameSite: 'strict', //クロスサイトリクエストの場合には送信しない
        maxAge: 1000 * 60 * 60 * 1000, //7日間有効
      });
      
      res.send("Login successful And cookie set");
    } else {

    }
  } catch (error) {
    console.log(error);
    res.send("Error logging in user");
  } finally {
    //データベースとの接続を切断
    await client.end();
  }


})


export default router;