export class Post {
  constructor(
    id: number,
    thread_id: number,
    user_id: number,
    content: string,
    created_at: Date
  ) {
    this.id = id;
    this.thread_id = thread_id;
    this.user_id = user_id;
    this.content = content;
    this.created_at = created_at;
  }

  id: number;
  thread_id: number;
  user_id: number;
  content: string;
  created_at: Date;

}

export interface post_registration {
  thread_id: number;
  user_id: string;
  content: string;
  title: string;
}

export type getCommentsRequest = {
  post_id: Number;
}

export type getCommentsResponse = {
  post_id: string;
  post_title: string;
  post_content: string;
  rowCounts: number;
  rows?: {
    comment_id: string;
    comment_content: string;
    user_id: string;
    user_name: string; //usersテーブルから取得
    comment_created_at: string;
  }[],
}

export type post_info = {
  title: string;
  content: string;
  category_id: Number;
}