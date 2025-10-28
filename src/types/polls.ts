export interface Poll {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  ends_at?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
  poll_options?: PollOption[];
  poll_votes?: PollVote[];
  _count?: {
    poll_votes: number;
  };
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  official_item_id?: string;
  image_url?: string;
  created_at: string;
  official_items?: {
    title: string;
    image: string;
  };
  _count?: {
    poll_votes: number;
  };
}

export interface PollVote {
  id: string;
  poll_id: string;
  poll_option_id: string;
  user_id: string;
  created_at: string;
}
