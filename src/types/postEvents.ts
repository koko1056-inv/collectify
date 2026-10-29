import type { Tables } from "@/integrations/supabase/types";

/** お題イベント（post_events の1行）。参加は item_posts.event_id を付けた投稿 */
export type PostEvent = Tables<"post_events">;

export type PostEventStatus = "draft" | "active" | "closed";

/** 画面での状態。DB の status に、期間（始まる前・締め切り後）を重ねたもの */
export type PostEventPhase = "draft" | "upcoming" | "open" | "ended";

export interface PostEventStats {
  postCount: number;
  participantCount: number;
}

/** 表紙の色が無いときの色（アプリのローズ） */
export const DEFAULT_EVENT_COLOR = "#E4577C";

export function eventPhase(e: Pick<PostEvent, "status" | "starts_at" | "ends_at">, now = Date.now()): PostEventPhase {
  if (e.status === "draft") return "draft";
  if (e.status === "closed") return "ended";
  if (now < new Date(e.starts_at).getTime()) return "upcoming";
  if (now >= new Date(e.ends_at).getTime()) return "ended";
  return "open";
}

/** 締め切りまでの残り日数（切り上げ。今日中に終わるなら 0） */
export function daysLeft(e: Pick<PostEvent, "ends_at">, now = Date.now()): number {
  const ms = new Date(e.ends_at).getTime() - now;
  if (ms <= 0) return 0;
  return Math.floor(ms / 86_400_000);
}

export function eventColor(e: Pick<PostEvent, "color">): string {
  return e.color && /^#[0-9a-f]{6}$/i.test(e.color) ? e.color : DEFAULT_EVENT_COLOR;
}
