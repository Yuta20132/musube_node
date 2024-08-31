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