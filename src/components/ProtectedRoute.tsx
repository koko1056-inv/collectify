import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // requiredRole が指定された場合はロールを検証する。
  // 未指定なら問い合わせ自体を行わない（通常ルートに余分なリクエストを増やさない）。
  const { data: hasRole, isLoading: roleLoading } = useQuery({
    queryKey: ["has-role", requiredRole, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: requiredRole!,
      });
      if (error) throw error;
      return data === true;
    },
    enabled: !!user && !!requiredRole,
  });

  if (loading) {
    // null を返すと認証チェック中に白画面になるため、共通のローディング画面を表示
    return <LoadingScreen />;
  }

  if (!user) {
    // ログイン後に元の画面へ戻す。/login や / を redirect にすると循環するためガード。
    const raw = location.pathname + location.search;
    const safe = raw.startsWith("/login") || raw === "/" ? "/collection" : raw;
    const redirect = encodeURIComponent(safe);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (requiredRole) {
    // ロール確認が終わるまで子要素を描画しない（権限が要る画面を先に見せない）
    if (roleLoading) {
      return <LoadingScreen />;
    }
    if (!hasRole) {
      // 「/」経由にすると RootRedirect でもう一度遷移して履歴が二重になるため、
      // 遷移先を直接指定する。
      return <Navigate to="/collection" replace />;
    }
  }

  return <>{children}</>;
}
