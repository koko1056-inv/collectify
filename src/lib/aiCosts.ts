/**
 * AI 生成の値段（pt）。正は各 Edge Function の定数で、ここは画面に出すための写し。
 * 変えるときは両方そろえること。
 *
 *   - editImage: supabase/functions/edit-image（グッズ展示場・着せ替え）
 *   - avatar:    supabase/functions/generate-avatar（初回無料）
 *   - postImage: supabase/functions/generate-post-image（アバターと同じ1枚の生成なので同じ値段）
 *   - aiRoom:    supabase/functions/generate-ai-room（初回無料）
 */
export const AI_COSTS = {
  editImage: 20,
  avatar: 30,
  postImage: 30,
  aiRoom: 100,
} as const;
