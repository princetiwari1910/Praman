export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  auth_provider: 'email' | 'google';
  created_at: string;
  last_login_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
