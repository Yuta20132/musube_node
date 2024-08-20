export class user_registration {
  constructor(
    name: string,
    first_name: string,
    last_name: string,
    category_id: number,
    email: string,
    password: string) {
    this.name = name;
    this.first_name = first_name;
    this.last_name = last_name;
    this.category_id = category_id;
    this.email = email;
    this.password = password;
    }
  name: string;
  first_name: string;
  last_name: string;
  category_id: number;
  email: string;
  password: string;
}

export class User extends user_registration {
  constructor(id: number, 
    name: string, 
    first_name: string,
    last_name: string,
    email: string,
    category_id: number,
    is_active: boolean, 
    is_admin: boolean,
    password: string,
    created_at: Date) {
    super(name, first_name, last_name, category_id, email, password);
    this.id = id;
    this.is_active = is_active;
    this.is_admin = is_admin;
    this.created_at = created_at;

  }
  id: number
  is_active: boolean;
  is_admin: boolean;
  created_at: Date;
}