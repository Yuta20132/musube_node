import client from '../db/client';

//データベースとの接続確認用

export async function getCurrentTime() {
  try {
    //データベースに接続
    await client.connect();

    //現在の時刻を取得するクエリを実行
    const res = await client.query('SELECT NOW()');

    //取得した時刻を返す
    return res.rows[0].now;
  } catch (err) {
    console.error('Error executing query',err);
    throw err;
  } finally {
    //データベースとの接続を切断
    await client.end();
  }
}