export type CommentReaction = "helpful" | "thanks" | "agree";

export interface ItemCommentNode {
  id: string;
  official_item_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  // 自分がhelpfulを付けているか
  myReaction?: CommentReaction | null;
  replies?: ItemCommentNode[];
}
