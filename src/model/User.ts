export class User {
  constructor(id: number, 
    name: string, 
    firstname: string,
    lastname: string,
    email: string,
    is_active: boolean, 
    is_admin: boolean,
    password: string,
    created_at: Date) {
    this.id = id;
    this.name = name;
    this.firstname = firstname;
    this.lastname = lastname;
    this.email = email;
    this.is_active = is_active;
    this.is_admin = is_admin;
    this.password = password;
    this.created_at = created_at;
  }

  id: number;
  name: string;
  firstname: string;
  lastname: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  password: string;
  created_at: Date;
}