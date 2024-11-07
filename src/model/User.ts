export class user_registration {
  constructor(
    user_name: string,
    first_name: string,
    last_name: string,
    category_id: number,
    institution: string,
    email: string,
    password: string) {
    this.user_name = user_name;
    this.first_name = first_name;
    this.last_name = last_name;
    this.category_id = category_id; 
    this.institution = institution;
    this.email = email;
    this.password = password;
    }
  user_name: string;
  first_name: string;
  last_name: string;
  category_id: number;
  institution: string;
  email: string;
  password: string;
}

export class user_login {
  constructor(user_id: string, category_id: string) {
    this.user_id = user_id;
    this.category_id = category_id;
  }
  user_id: string;
  category_id: string;
}

export class User extends user_registration {
  constructor(id: number, 
    name: string, 
    first_name: string,
    last_name: string,
    email: string,
    category_id: number,
    institution: string,
    is_active: boolean, 
    is_admin: boolean,
    password: string,
    created_at: Date) {
    super(name, first_name, last_name, category_id,institution, email, password);
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

export class mailInfo {
  constructor(id: string, email: string) {
    this.id = id;
    this.email = email;
  }
  id: string;
  email: string;
}