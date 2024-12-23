export class thread_registration {
  constructor(
    title: string,
    description: string,
    category_id: number,
  ) {
    this.title = title;
    this.description = description;
    this.category_id = category_id;
}

  title: string;
  description: string;
  category_id: number;

}
export class Thread {
  constructor(
    id: number,
    title: string,
    description: string,
    category_id: number,
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.category_id = category_id;
  }

  id: number;
  title: string;
  description: string;
  category_id: number;

}

export type getPostsRequest = {
  thread_id: string;
  limit?: number;
  offset?: number;
}

export type getPostsResponse = {
  thread_id: string;
  thread_title: string;
  thread_description: string;
  rowCounts: number;
  rows?: {
    post_id: string;
    post_content: string;
    post_title: string;
    user_id: string;
    user_name: string; //usersテーブルから取得
    post_created_at: string;
  }[],
}
