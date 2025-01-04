export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_admin: boolean | null;
  created_at: string;
  interests: string[] | null;
}