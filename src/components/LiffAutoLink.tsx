import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// LINEアプリ内(LIFF)で開かれた時だけ、ログイン中のCollectifyアカウントと
// LINEユーザーIDを line_user_links に紐付ける（パーソナライズ通知の土台）。
// VITE_LIFF_ID 未設定 / LINE外 / 未ログイン のときは完全に何もしない。
// LIFF ID は公開情報（クライアントに露出）なので既定値を直接埋め込み、
// 環境変数 VITE_LIFF_ID があればそちらを優先。
const LIFF_ID = (import.meta.env.VITE_LIFF_ID as string | undefined) || "2010453556-4OGxmwaE";
const LIFF_SDK = "https://static.line-scdn.net/liff/edge/2/sdk.js";
// LINEログインのリダイレクトで LIFF コンテキストが失われても、後続の
// Collectifyログイン後に連携を完了できるよう、捕捉した LINE uid を一時保存する。
const PENDING_KEY = "collectify:liff_pending_uid";

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
    if (!LIFF_ID) return;
    const inLine = /Line\//i.test(navigator.userAgent || "");
    let cancelled = false;

    // 自分の行のみ作成（RLSで本人に限定）。既存があれば無視。
    // line_user_links は別マイグレーションで作成するため、型生成前は any で呼ぶ。
    const linkIfReady = async (lineUserId: string | null | undefined) => {
      if (!lineUserId || !userId || cancelled) return;
      await (supabase as any)
        .from("line_user_links")
        .upsert(
          { line_user_id: lineUserId, user_id: userId },
          { onConflict: "line_user_id", ignoreDuplicates: true }
        );
      try {
        localStorage.removeItem(PENDING_KEY);
      } catch {
        /* localStorage 不可環境では無視 */
      }
    };

    (async () => {
      try {
        // 1) 以前に捕捉した LINE uid があれば（ログイン前 / ログインリダイレクト跨ぎ）、
        //    ユーザーが判明した今のタイミングで連携を完了させる。
        let pending: string | null = null;
        try {
          pending = localStorage.getItem(PENDING_KEY);
        } catch {
          /* noop */
        }
        if (pending && userId) await linkIfReady(pending);

        // 2) LINEのアプリ内ブラウザでのみ、現在の LINE uid を捕捉する。
        if (!inLine) return;
        const liff = await loadLiff();
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isInClient || !liff.isInClient()) return;
        if (!liff.isLoggedIn || !liff.isLoggedIn()) return;
        const profile = await liff.getProfile();
        const lineUserId: string | undefined = profile?.userId;
        if (!lineUserId || cancelled) return;
        // 捕捉できた時点で一時保存（この後ログインしても取りこぼさない）。
        try {
          localStorage.setItem(PENDING_KEY, lineUserId);
        } catch {
          /* noop */
        }
        await linkIfReady(lineUserId);
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
