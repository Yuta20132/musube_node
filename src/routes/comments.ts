import express from 'express';
import { getPayloadFromJWT, verifyJWT } from '../components/jwt';
import { CommentCreateController, CommentDeleteController, CommentUpdateController } from '../controllers/commentController';

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

  //payloadにあるユーザのcategory_idと受け取った投稿のcategory_idが一致しないまたはpayloadのcategory_idが5（管理者）でない場合はエラーを返す
  if (Number(payload.category_id) !== Number(category_id) && Number(payload.category_id) !== 5) {
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
    //category_idは投稿のカテゴリID
    await CommentCreateController(Number(post_id), payload.user_id, content, Number(category_id));
    res.status(200).send("コメントの作成に成功しました");
  } catch (err) {
    console.log(err);
    res.status(500).send("コメントの作成に失敗しました");
  }


});

//PUT /comments - コメント更新
router.put("/", async (req, res) => {
  const { comment_id, content } = req.body;
  
  // リクエストボディの検証
  if (comment_id === undefined || content === undefined) {
    res.status(400).send("comment_idまたはcontentが入力されていません");
    return;
  }

  // コメントIDを数値に変換できない場合はエラーを返す
  if (isNaN(Number(comment_id))) {
    res.status(400).send("comment_idが数値ではありません");
    return;
  }

  // contentが文字列でない場合はエラーを返す
  if (typeof content !== 'string') {
    res.status(400).send("contentが文字列ではありません");
    return;
  }

  // contentが空の場合はエラーを返す
  if (content.trim() === '') {
    res.status(400).send("contentが空です");
    return;
  }

  // トークン検証
  const token = req.cookies.bulletin_token;
  if (token === undefined || token === null) {
    res.status(400).send("トークンがありません");
    return;
  }

  if (!verifyJWT(token)) {
    res.status(400).send("トークンが無効です");
    return;
  }

  const payload = getPayloadFromJWT(token);
  if (payload === null) {
    res.status(400).send("トークンの解析に失敗しました");
    return;
  }

  try {
    await CommentUpdateController(Number(comment_id), content, payload.user_id);
    res.status(200).send("コメントの更新に成功しました");
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send(error.message);
    } else {
      res.status(400).send("何らかのエラーが発生: " + error);
    }
  }
});

router.delete("/", async (req, res) => {
  const { comment_id, user_id } = req.body;
  if (comment_id === undefined || user_id === undefined) {
    res.status(400).send("comment_idまたはuser_idが入力されていません");
    return;
  }

  //コメントIDを数値に変換できない場合はエラーを返す
  if (isNaN(Number(comment_id))) {
    res.status(400).send("comment_idが数値ではありません");
    return;
  }

  
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
  const payload_user_id = payload.user_id;

  //1.payloadのユーザIDと受け取ったユーザIDが一致しない
  //2.payloadのカテゴリIDが5（管理者）じゃない
  //1と2の両方が満たされた場合はエラーを返す
  if (Number(payload_user_id) !== Number(user_id) && Number(payload.category_id) !== 5) {
    res.status(400).send("権限がありません");
    return;
  }

  try {
    await CommentDeleteController(Number(comment_id));
    res.status(200).send("コメントを削除しました");
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send(error.message);
    } else {
      res.status(400).send("何らかのエラーが発生: " + error);
    }
  }

  
})

export default router;