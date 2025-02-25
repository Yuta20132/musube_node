import e from "express";
import express from "express";
import { getPayloadFromJWT, verifyJWT } from "../components/jwt";
import { CommentGetByPostIdController, PostCreateController, PostDeleteController, PostGetController } from "../controllers/postController";
import { getCommentsRequest, post_registration } from "../model/Post";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("All posts");
});

//thread_id, category_id, content, titleを受け取って投稿を作成する
router.post("/", async (req, res) => {
  //thread_id, category_id, content, titleを受け取る
  const { thread_id, category_id, content, title } = req.body;
  //thread_id, category_id, content, titleがない場合はエラーを返す

  const thread_flag = thread_id === undefined;
  const content_flag = content === undefined;
  const title_flag = title === undefined;
  const category_flag = category_id === undefined;

  if (thread_flag || content_flag || title_flag || category_flag) {
    res
      .status(400)
      .send(
        `${thread_flag ? "thread_id " : ""}${
          category_flag ? "category_id " : ""
        }${content_flag ? "content " : ""}${
          title_flag ? "title" : ""
        }が入力されていません`
      );
    return;
  }

  //トークンがあるか確認
  const token = req.cookies.bulletin_token;
  if (token === undefined) {
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
  

  //payloadにあるユーザのcategory_idと受け取った投稿のcategory_idが一致する、またはpayloadのcategory_idが5（管理者）じゃない場合はエラーを返す
  if (Number(payload.category_id) !== Number(category_id) && Number(payload.category_id) !== 5) {
    res.status(400).send("権限がありません");
    return;
  }

  //console.log(payload.user_id);

  //thread_idを数値に変換し、数値に変換できない場合はエラーを返す
  if (isNaN(Number(thread_id))) {
    res.status(400).send("スレッドのIDが数値ではありません");
    return;
  }

  //category_idを数値に変換し、数値に変換できない場合はエラーを返す
  let category_id_num;
  if (isNaN(Number(category_id))) {
    res.status(400).send("カテゴリIDが数値ではありません");
    return;
  } else {
    category_id_num = Number(category_id);
  }

  //渡す用のオブジェクトを作成
  const post: post_registration = {
    thread_id: Number(thread_id),
    user_id: payload.user_id,
    content: content,
    title: title,
  };

  //投稿を作成
  try {
    await PostCreateController(post, category_id_num);
    res.status(200).send("投稿に成功しました");
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      res.status(400).send(error.message);
    } else {
      res.status(400).send("何らかのエラーが発生: " + error);
    }
  }
});

router.delete("/", async (req, res) => {
  const { post_id, user_id } = req.body;
  if (post_id === undefined || user_id === undefined) {
    res.status(400).send("post_idまたはuser_idが入力されていません");
    return;
  }

  //ポストIDを数値に変換できない場合はエラーを返す
  if (isNaN(Number(post_id))) {
    res.status(400).send("post_idが数値ではありません");
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

  //一応ここでエラー起きるようにしてるけど、フロント側で自分の投稿じゃないものを消せないようにしてるから起きないと思う
  if (Number(payload_user_id) !== Number(user_id)) {
    res.status(400).send("権限がありません");
    return;
  }

  try {
    await PostDeleteController(Number(post_id));
    res.status(200).send("投稿を削除しました");
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send(error.message);
    } else {
      res.status(400).send("何らかのエラーが発生: " + error);
    }
  }

  
})

//ポストIDからコメントを取得
router.get("/:post_id/comments", async (req, res) => {
  //トークンがあるか確認
  const token = req.cookies.bulletin_token;
  if (token === undefined) {
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
  //ポストIDを取得
  const post_id = Number(req.params.post_id);
  //ポストIDがない場合はエラーを返す
  if (post_id === undefined) {
    res.status(400).send("ポストIDがありません");
    return;
  }

  //ポストIDを数値に変換できない場合はエラーを返す
  if (isNaN(Number(post_id))) {
    res.status(400).send("ポストIDが数値ではありません");
    return;
  }

  try {
    //まず、ポストIDからポストの情報を取得
    const post_info = await PostGetController(Number(post_id));

    //payload.category_idが5（管理者）でない場合、かつ、ポストのカテゴリIDとpayload.category_idが一致しない場合かつ、post_info.category_idが1（全体）でない場合はエラーを返す
    if (Number(payload.category_id) !== 5 && post_info.category_id !== Number(payload.category_id) && post_info.category_id !== 1) {
      res.status(400).send("権限がありません");
      return;
    }

    const req: getCommentsRequest = {
      post_id: Number(post_id)
    }

    //ポストのIDからコメントを取得
    const comments = await CommentGetByPostIdController(req);

    //
    comments.post_content = post_info.content;
    comments.post_title = post_info.title;

    res.status(200).send(comments);

  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send(error.message);
    } else {
      res.status(400).send("何らかのエラーが発生: " + error);
    }
  }

})

export default router;
