import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * ルート ("/") のリダイレクト振り分け。
 * - 認証チェック中は何も表示しない（ちらつき防止）
 * - ログイン済み → /my-room（既存のホーム導線を維持）
 * - 未ログイン → /lp（マーケティングLPへ）
 */
export function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return <Navigate to={user ? "/my-room" : "/lp"} replace />;
}
