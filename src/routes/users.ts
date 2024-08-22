import express from "express";
import { user_registration } from "../model/User";
import { createRegistrationQuery } from "../components/createQuery";
import client from "../db/client";
import { hashPassword } from "../components/hashUtils";


const router = express.Router();

router.get("/", (req, res) => {
  res.send("All users");
});

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


export default router;