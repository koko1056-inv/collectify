import { supabase } from "@/integrations/supabase/client";

/**
 * 新しいタグが作られたことを運営にメールで知らせる。
 *
 * タグは全利用者に共有されるので、勝手な名前や表記揺れが増えていないかを
 * 把握できるようにする。
 *
 * 通知の失敗でタグ登録を失敗扱いにはしない（呼び出し側は待たなくてよい）。
 * メールの送信設定は Edge Function 側の Secrets で持つ。
 */
export function notifyNewTag(input: {
  name: string;
  category: string | null;
  contentName?: string | null;
  /** どの画面から作られたか（あとで経路を絞り込めるように） */
  source: string;
}): void {
  // 意図的に await しない。通知が遅くても登録の完了を待たせない。
  void supabase.functions
    .invoke("notify-new-tag", {
      body: {
        name: input.name,
        category: input.category,
        contentName: input.contentName ?? null,
        source: input.source,
      },
    })
    .catch((error) => {
      console.error("notifyNewTag failed:", error);
    });
}
