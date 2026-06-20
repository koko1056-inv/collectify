import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * LIFFディープリンク解決:
 * リッチメニューの liff.line.me/{id}/<path> で開くと、ルートに
 * ?liff.state=<path> が付与されて届く。SDK初期化を待たずにここで
 * 目的の画面へ直接遷移し、「毎回LPに入る」現象を防ぐ。
 */
function liffStateDest(): string | null {
  try {
    const s = new URLSearchParams(window.location.search).get("liff.state");
    if (!s) return null;
    const d = decodeURIComponent(s).trim();
    if (!d) return null;
    return d.startsWith("/") ? d : `/${d}`;
  } catch {
    return null;
  }
}

/**
 * ルート ("/") のリダイレクト振り分け。
 * - liff.state があれば最優先でその画面へ
 * - 認証チェック中は何も表示しない（ちらつき防止）
 * - ログイン済み → /my-room（既存のホーム導線を維持）
 * - 未ログイン → LINEアプリ内ならログイン導線、それ以外はマーケLP(/lp)
 */
export function RootRedirect() {
  const { user, loading } = useAuth();

  const dest = liffStateDest();
  if (dest && dest !== "/") {
    return <Navigate to={dest} replace />;
  }

  if (loading) {
    return null;
  }

  if (!user) {
    // LINEアプリ内では /lp（マーケLP）に落とさず、ログイン→アプリへ繋ぐ。
    const inLine = /Line\//i.test(navigator.userAgent || "");
    return <Navigate to={inLine ? "/login?redirect=%2Fmy-room" : "/lp"} replace />;
  }

  return <Navigate to="/my-room" replace />;
}
