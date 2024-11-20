import express from "express";
import { Thread, thread_registration } from "../model/Threads";
import { ThreadGetController, ThreadRegistrationController } from "../controllers/threadsController";
import { getPayloadFromJWT, verifyJWT } from "../components/jwt";
import { user_login } from "../model/User";


const router = express.Router();

router.get("/", (req, res) => {
  //とりあえず全スレッドの情報を返す
  //その中のポストやコメントの情報は他のAPIで取得するようにする？あとで考える
  res.send("All threads");
});

//スレッドの取得
// GET /threads/:category_id
router.get("/:category_id", async(req, res) => {
  //カテゴリIDを受け取る
  const req_category_id = req.params.category_id;
  //カテゴリIDがない場合はエラーを返す
  if (req_category_id === undefined) {
    res.status(400).send("カテゴリIDがありません");
    return;
  }

  //クッキーからトークンを取得
  const token = await req.cookies.bulletin_token;
  //なければエラーを返す
  if (token === undefined) {
    res.status(400).send("トークンがありません");
    return
  }

  try {
    //トークンの検証
    if (!verifyJWT(token)) {
      res.status(400).send("トークンが無効です");
      return;
    }

    //トークンから情報を取得
    const payload = getPayloadFromJWT(token);

    if (payload === null) {
      throw new Error("トークンの解析に失敗しました");
    }


    //payloadからユーザIDとカテゴリIDを取得し、user_loginに代入
    const user: user_login = {
      user_id: payload.user_id,
      category_id: payload.category_id
    }

    //カテゴリIDが一致せず、かつカテゴリIDが5（管理者）でない場合、またはカテゴリIDが1（全体）でない場合はエラーを返す
    if(req_category_id !== user.category_id  && user.category_id !== "5" && req_category_id !== "1") {
      res.status(400).send("権限がありません");
      return;
    }

    const Threads = await ThreadGetController(req_category_id);
    console.log("取得したスレッド");
    console.log(Threads);
    res.status(200).send(Threads);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).send(err.message);
    } else {
      res.status(400).send("なんらかのエラーが発生しました" + err);
    }
  }
});

//スレッド作成
//スレッドのタイトルと内容、カテゴリIDを受け取る
router.post("/", async(req, res) => {
  //cookieからsession_idを取得
  const session_id = await req.cookies.bulletin_token;
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