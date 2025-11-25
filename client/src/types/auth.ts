/**
 * Authentication types
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  dealership_id: string;
  dealership_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'manager' | 'salesperson' | 'finance' | 'service';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  expires_in: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  dealership_id: string;
  iat: number;
  exp: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
