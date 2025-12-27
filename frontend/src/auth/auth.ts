// src/auth/auth.ts
import { jwtDecode } from "jwt-decode";  // Remove 'default'

export interface UserPayload {
  email: string;
  name: string;
  role: string;
  exp: number;
}

export function decodeToken(token: string): UserPayload {
  return jwtDecode<UserPayload>(token);
}