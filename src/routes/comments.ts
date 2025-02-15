import express from 'express';
import { getPayloadFromJWT, verifyJWT } from '../components/jwt';
import { CommentCreateController } from '../controllers/commentController';

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
  if (payload.category_id !== category_id && payload.category_id !== "5") {
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

export default router;