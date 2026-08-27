import type { User, UserRole } from "@/types";

export type RegisterAccountType = "CLIENT" | "SELLER";

export interface RegisterPayload {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  /** WhatsApp number — required at registration */
  phone: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateMePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar?: string;
}

export interface AuthUser extends User {
  role: UserRole;
}
