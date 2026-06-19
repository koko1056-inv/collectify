import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// LINEアプリ内(LIFF)で開かれた時だけ、ログイン中のCollectifyアカウントと
// LINEユーザーIDを line_user_links に紐付ける（パーソナライズ通知の土台）。
// VITE_LIFF_ID 未設定 / LINE外 / 未ログイン のときは完全に何もしない。
const LIFF_ID = import.meta.env.VITE_LIFF_ID as string | undefined;
const LIFF_SDK = "https://static.line-scdn.net/liff/edge/2/sdk.js";

function loadLiff(): Promise<any> {
  const w = window as any;
  if (w.liff) return Promise.resolve(w.liff);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = LIFF_SDK;
    s.onload = () => resolve(w.liff);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export function LiffAutoLink() {
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!LIFF_ID || !userId) return;
    // LINEのアプリ内ブラウザでのみ動かす（Webユーザーでは SDK も読み込まない）
    if (!/Line\//i.test(navigator.userAgent || "")) return;

    let cancelled = false;
    (async () => {
      try {
        const liff = await loadLiff();
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isInClient || !liff.isInClient()) return;
        if (!liff.isLoggedIn()) return;
        const profile = await liff.getProfile();
        const lineUserId: string | undefined = profile?.userId;
        if (!lineUserId || cancelled) return;
        // 自分の行のみ作成（RLSで本人に限定）。既存があれば無視。
        // line_user_links は別マイグレーションで作成するため、型生成前は any で呼ぶ。
        await (supabase as any)
          .from("line_user_links")
          .upsert(
            { line_user_id: lineUserId, user_id: userId },
            { onConflict: "line_user_id", ignoreDuplicates: true }
          );
      } catch (e) {
        // 連携失敗は致命的でないため握りつぶす（テーブル未作成・LIFF未設定など）
        console.warn("LIFF link skipped:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}
