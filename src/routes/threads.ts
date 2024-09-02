import express from "express";
import { Thread, thread_registration } from "../model/Threads";
import { ThreadRegistrationController } from "../controllers/threadsController";


const router = express.Router();

router.get("/", (req, res) => {
  //とりあえず全スレッドの情報を返す
  //その中のポストやコメントの情報は他のAPIで取得するようにする？あとで考える
  res.send("All threads");
});

//スレッド作成
//スレッドのタイトルと内容、カテゴリIDを受け取る
router.post("/", async(req, res) => {
  //cookieからsession_idを取得
  const session_id = await req.cookies.session_id;
  console.log(session_id);
  //なければエラーを返す
  if (session_id === undefined) {
    res.status(400).send("セッションがありません");
    return;
  }

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
    //controllerにスレッド情報とセッションIDを渡す
    const is_success = await ThreadRegistrationController(session_id, thread);
    //成功した場合はステータスコード200を返す
    if (is_success) {
      res.status(200).send("スレッドの作成に成功しました");
    } else {
      res.status(400).send("スレッドの作成に失敗しました");
    }
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).send(err.message);
    } else {
      res.status(400).send("なんらかのエラーが発生しました" + err);
    }
  }
  


});

export default router;