export interface AuthError {
  message: string;
  status?: number;
}

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    avatar_url?: string;
    email?: string;
    email_verified?: boolean;
    full_name?: string;
    iss?: string;
    name?: string;
    preferred_username?: string;
    provider_id?: string;
    sub?: string;
    user_name?: string;
  };
}