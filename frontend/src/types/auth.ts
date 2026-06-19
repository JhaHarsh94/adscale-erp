export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface Role {
  id: string;
  name: string;
  description?: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: UserStatus;
  role?: Role;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: AuthUser;
  };
}