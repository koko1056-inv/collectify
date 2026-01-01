export interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

export interface PartnerProfile {
  id: string;
  username: string; 
  display_name: string | null;
  avatar_url: string | null;
}
