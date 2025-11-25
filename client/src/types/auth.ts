/**
 * Authentication types
 */

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  dealership_id: string;
  dealership_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'SALESPERSON' | 'FINANCE' | 'SERVICE';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface JwtPayload {
  sub: string;
  user_id: string;
  email: string;
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
