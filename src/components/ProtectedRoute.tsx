import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // null を返すと認証チェック中に白画面になるため、共通のローディング画面を表示
    return <LoadingScreen />;
  }

  if (!user) {
    // ログイン後に元の画面（例: リッチメニューで開いた /collection）へ戻せるよう、
    // 現在のパスを redirect に載せる。
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
}
