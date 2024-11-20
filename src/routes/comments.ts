import express from 'express';
import { getPayloadFromJWT, verifyJWT } from '../components/jwt';
import { CommentCreateController, CommentDeleteController } from '../controllers/commentController';
import e from 'express';

const router = express.Router();

router.get("/", (req, res) => {
  res.send("All comments");
});

//post_id, content, category_idを受け取ってコメントを作成する
//commentControllerに送るのはpost_idとcontent, payloadから取得したuser_idを送る
router.post("/", async (req, res) => {
  const { post_id, category_id, content } = req.body;
  //post_id, contentがない場合はエラーを返す
  if (post_id === undefined || content === undefined || category_id === undefined) {
    res.status(400).send(`${post_id === undefined ? "post_id " : ""}${category_id === undefined ? "category_id " : ""}${content === undefined ? "content" : ""}が入力されていません`);
    return;
  }

  //トークンがあるか確認
  const token = req.cookies.bulletin_token;
  if (token === undefined || token === null) {
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

  //payloadにあるユーザのcategory_idと受け取った投稿のcategory_idが一致しないか、payloadのcategory_idが5(管理者)でない場合はエラーを返す
  if (Number(payload.category_id) !== 5 && Number(payload.category_id) !== Number(category_id)) {
    res.status(400).send("権限がありません");
    return;
  }

  //thread_idを数値に変換できるか確認
  if (isNaN(Number(post_id))) {
    res.status(400).send("post_idが数値ではありません");
    return;
  } 
  
  //category_idを数値に変換できるか確認
  if (isNaN(Number(category_id))) {
    res.status(400).send("category_idが数値ではありません");
    return;
  }

  try {
    //コメントの作成
    await CommentCreateController(Number(post_id), payload.user_id, content);
    res.status(200).send("コメントの作成に成功しました");
  } catch (err) {
    console.log(err);
    res.status(500).send("コメントの作成に失敗しました");
  }


});

//コメントの削除
//comment_idとuser_idを受け取り、自身のトークンのuser_idと一致するか確認
//使うかわからん
router.delete("/", async(req, res) => {
  //req.bodyからcomment_idとuser_idを取得
  const { comment_id, user_id } = req.body;
  //comment_id, user_idがない場合はエラーを返す
  if (comment_id === undefined || user_id === undefined) {
    res.status(400).send(`${comment_id === undefined ? "comment_id " : ""}${user_id === undefined ? "user_id" : ""}が入力されていません`);
    return;
  }

  //トークンがあるか確認
  const token = req.cookies.bulletin_token;
  if (token === undefined || token === null) {
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
  //payloadのuser_idと受け取ったuser_idが一致しない場合はエラーを返す
  if (payload.user_id !== user_id) {
    res.status(400).send("権限がありません");
    return;
  }
  //comment_idを数値に変換できるか確認
  if (isNaN(Number(comment_id))) {
    res.status(400).send("comment_idが数値ではありません");
    return;
  }

  //コメントの削除処理
  try {

    //コメントの削除
    await CommentDeleteController(Number(comment_id));
    res.status(200).send("コメントの削除に成功しました");
  } catch (err) {
    if (err instanceof Error) {
      console.log(err);
      res.status(500).send("コメントの削除に失敗しました");
    }
  }
});

export default router;