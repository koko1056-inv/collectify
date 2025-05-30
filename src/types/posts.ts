
export interface GoodsPost {
  id: string;
  user_id: string;
  user_item_id: string;
  caption?: string;
  image_url: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
  user_items?: {
    title: string;
    image: string;
  };
  post_likes?: Array<{
    id: string;
    user_id: string;
  }>;
  _count?: {
    post_likes: number;
    post_comments: number;
  };
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}
