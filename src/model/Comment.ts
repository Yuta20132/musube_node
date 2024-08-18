export class Comment {
  constructor(
    id: number,
    post_id: number,
    user_id: number,
    content: string,
    created_at: Date
  ) {
    this.id = id;
    this.post_id = post_id;
    this.user_id = user_id;
    this.content = content;
    this.created_at = created_at;
  }

  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: Date;
  
}