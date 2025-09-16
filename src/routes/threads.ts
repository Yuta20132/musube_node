import express from "express";
import { getPostsRequest, Thread, thread_registration } from "../model/Threads";
import { GetPostsByThreadIdController, ThreadCategoryGetController, ThreadGetController, ThreadGetWithPaginationController, ThreadRegistrationController, ThreadDeleteController } from "../controllers/threadsController";
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
    if(Number(req_category_id) !== Number(user.category_id)  && Number(user.category_id) !== 5 && Number(req_category_id) !== 1) {
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

// スレッド取得（ページネーション）
// GET /threads/:category_id/paginate?page=1&limit=20
router.get("/:category_id/paginate", async (req, res) => {
  const req_category_id = req.params.category_id;
  if (req_category_id === undefined) {
    res.status(400).send("カテゴリIDがありません");
    return;
  }

  // クッキーからトークン取得
  const token = await req.cookies.bulletin_token;
  if (token === undefined) {
    res.status(400).send("トークンがありません");
    return;
  }

  try {
    // トークン検証
    if (!verifyJWT(token)) {
      res.status(400).send("トークンが無効です");
      return;
    }

    const payload = getPayloadFromJWT(token);
    if (payload === null) {
      throw new Error("トークンの解析に失敗しました");
    }

    // アクセス権限チェック
    const user: user_login = {
      user_id: payload.user_id,
      category_id: payload.category_id,
    };
    if (Number(req_category_id) !== Number(user.category_id) && Number(user.category_id) !== 5 && Number(req_category_id) !== 1) {
      res.status(400).send("権限がありません");
      return;
    }

    // クエリからページとリミットを取得（デフォルト: page=1, limit=20）
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const result = await ThreadGetWithPaginationController(req_category_id, page, limit);
    res.status(200).send(result);
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
  const token = await req.cookies.bulletin_token;
  console.log("token", token);
  //なければエラーを返す
  if (token === undefined) {
    res.status(400).send("セッションがありません");
    return;
  }

  //トークンの検証
  if (!verifyJWT(token)) {
    res.status(400).send("トークンが無効です");
    return;
  }
  //トークンから情報を取得
  const payload = getPayloadFromJWT(token);
  //情報が取得できない場合はエラーを返す
  if (payload === null) {
    res.status(400).send("トークンの解析に失敗しました");
    return;
  }

  //payload.caegory_idが5（管理者）でない,かつpayload.category_idがcategory_idと一致しない場合はエラーを返す
  if (Number(payload.category_id) !== 5 && Number(payload.category_id) !== Number(req.body.category_id)) {
    res.status(400).send("権限がありません");
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

  console.log("title: ", title);
  console.log("description: ", description);
  console.log("category_id: ", category_id);

  const thread: thread_registration = {
    title: title,
    description: description,
    category_id: category_id
  }

  try {
    //controllerにスレッド情報とクッキーを渡す
    const is_success = await ThreadRegistrationController(thread);
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


//スレッドの中の投稿を取得
//limitは
//GET /threads/123/posts?limit=5&offset=10
//例1 limit=5 offset=10 な11件目から15件目までの投稿を取得
//例2 limit=5 offset=0 な1件目から5件目までの投稿を取得
router.get("/:thread_id/posts", async(req, res) => {
  //クッキーからトークンを取得
  const token = req.cookies.bulletin_token;
  //なければエラーを返す
  if (token === undefined) {
    res.status(400).send("トークンがありません");
    return
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

  //情報をGetPostsRequestに代入
  //limitとoffsetがない場合はデフォルト値を代入
  //limitが0以下の場合はエラーを返す
  if (req.query.limit !== undefined && Number(req.query.limit) <= 0) {
    res.status(400).send("limitが不正な値です");
    return;
  }

  //offsetが0以下の場合はエラーを返す
  if (req.query.offset !== undefined && Number(req.query.offset) < 0) {
    res.status(400).send("offsetが不正な値です");
    return;
  }
  
  const req_params: getPostsRequest = {
    thread_id: req.params.thread_id,
    limit: req.query.limit === undefined ? 5 : Number(req.query.limit),
    offset: req.query.offset === undefined ? 0 : Number(req.query.offset)
  }

  try {
    const thread_info = await ThreadCategoryGetController(Number(req_params.thread_id));

    //payload.category_idが5（管理者）でない,かつpayload.category_idがcategory_idと一致しない場合はエラーを返す
    if (Number(payload.category_id) !== 5 && Number(payload.category_id) !== Number(thread_info.category_id)) {
      res.status(400).send("権限がありません");
      return;
    }

    const posts = await GetPostsByThreadIdController(req_params);
    
    posts.thread_title = thread_info.title;
    posts.thread_description = thread_info.description;
    
    res.status(200).send(posts);

  } catch (err) {
    if (err instanceof Error) {
      res.status(400).send(err.message);
    } else {
      res.status(400).send("なんらかのエラーが発生" + err);
    }
  }

});

router.delete("/", async (req, res) => {
  const { thread_id, user_id } = req.body;
  if (thread_id === undefined || user_id === undefined) {
    res.status(400).send("thread_idまたはuser_idが入力されていません");
    return;
  }

  //スレッドIDを数値に変換できない場合はエラーを返す
  if (isNaN(Number(thread_id))) {
    res.status(400).send("thread_idが数値ではありません");
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
    await ThreadDeleteController(Number(thread_id));
    res.status(200).send("スレッドを削除しました");
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send(error.message);
    } else {
      res.status(400).send("何らかのエラーが発生: " + error);
    }
  }

  
})

export default router;
