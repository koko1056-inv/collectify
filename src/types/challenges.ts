export interface Challenge {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  image_url?: string;
  official_item_id?: string;
  starts_at: string;
  ends_at: string;
  status: 'active' | 'ended' | 'cancelled';
  first_place_points: number;
  second_place_points: number;
  third_place_points: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
  official_items?: {
    id: string;
    title: string;
    image: string;
  };
  challenge_entries?: { id: string }[];
  _count?: {
    entries: number;
  };
}

export interface ChallengeEntry {
  id: string;
  challenge_id: string;
  user_id: string;
  user_item_id?: string;
  image_url: string;
  caption?: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
  user_items?: {
    title: string;
    image: string;
  };
  challenge_votes?: ChallengeVote[];
  _count?: {
    votes: number;
  };
}

export interface ChallengeVote {
  id: string;
  challenge_id: string;
  entry_id: string;
  user_id: string;
  created_at: string;
}
