
export interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

export interface PartnerProfile {
  username: string; 
  display_name: string | null;
}
