import express from "express";
import { Thread, thread_registration } from "../model/Threads";


const router = express.Router();

router.get("/", (req, res) => {
  //とりあえず全スレッドの情報を返す
  //その中のポストやコメントの情報は他のAPIで取得するようにする？あとで考える
  res.send("All threads");
});

//スレッド作成
//スレッドのタイトルと内容、カテゴリIDを受け取る
router.post("/", (req, res) => {
  let { title, description, category_id } = req.body;
  //タイトルまたはカテゴリIDがない場合はエラーを返す
  if (title === undefined || category_id === undefined) {
    res.status(400).send("タイトルまたはカテゴリIDがありません");
    return;
  }

  //内容がない場合は空文字を代入
  if (description === undefined) {
    description = "";
  }

  const thread: thread_registration = {
    title: title,
    description: description,
    category_id: category_id
  }

  try {
    //controllerにスレッド情報を渡す（後で作成）
    
  } catch (err) {
    //エラーメッセージを返す
    res.status(400).send("スレッドの作成に失敗しました");
  }
  


});

export default router;