import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LINE_ADD_FRIEND_URL, LIFF_URL } from "@/config/lineAuth";

const DISMISS_KEY = "collectify:line_friend_prompt_dismissed_until";

function isDismissed(): boolean {
  try {
    const until = localStorage.getItem(DISMISS_KEY);
    return !!until && Number(until) > Date.now();
  } catch {
    return false;
  }
}

/** 閉じたら7日間は出さない。 */
export function dismissLineFriendPrompt() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  } catch {
    /* localStorage 不可環境では無視（次回また出るだけ） */
  }
}

/**
 * LINE友だち追加カードを出すべきかどうか。
 * - VITE_LINE_OA_BASIC_ID が未設定なら常にfalse
 * - 7日以内に閉じていればfalse
 * - すでに line_user_links があり friend_added が true ならfalse（出す理由が無い）
 */
export function useLineFriendPrompt() {
  const { user } = useAuth();
  const [friendAdded, setFriendAdded] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!LINE_ADD_FRIEND_URL || !user?.id) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- line_user_links は型生成前（別マイグレーションで作成）
    (supabase as any)
      .from("line_user_links")
      .select("friend_added")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { friend_added: boolean | null } | null }) => {
        if (cancelled) return;
        setFriendAdded(data?.friend_added ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const shouldShow = !!LINE_ADD_FRIEND_URL && loaded && friendAdded !== true && !isDismissed();

  const openAddFriend = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- LIFF SDKをCDN経由で読むため型が無い
    const w = window as any;
    const inLine = /Line\//i.test(navigator.userAgent || "");
    if (inLine && w.liff?.isInClient?.()) {
      // LIFF内（＝LiffAutoLinkがすでに紐付け済み）なら、友だち追加の画面をLINE内で開く
      if (w.liff.openWindow) {
        w.liff.openWindow({ url: LINE_ADD_FRIEND_URL, external: true });
        return;
      }
    }
    if (inLine) {
      window.location.href = LINE_ADD_FRIEND_URL;
      return;
    }
    // LINE外のブラウザ/PWA: まずLIFF URLを開いてLiffAutoLinkで紐付ける（LINE側の設定次第で友だち追加も促される）
    window.location.href = LIFF_URL;
  }, []);

  return { shouldShow, openAddFriend, dismiss: dismissLineFriendPrompt };
}
