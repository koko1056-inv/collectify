import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift } from "lucide-react";

/**
 * 招待リンク `/invite/:code` の着地ページ。
 * - 未ログイン: ログイン画面へ `?invite=CODE` 付きで遷移（既存の自動適用フローに乗る）
 * - ログイン済み: ホームへ。すでに登録済みの旨を表示する余地はあるがシンプル化
 */
export default function InviteRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const upper = (code || "").toUpperCase();
    if (!upper) {
      navigate("/login", { replace: true });
      return;
    }
    // sessionStorage にも保存（既存サインアップフックも参照）
    sessionStorage.setItem("pending_invite_code", upper);

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // すでに登録済み — ホームへ
        navigate("/my-room", { replace: true });
      } else {
        navigate(`/login?invite=${upper}`, { replace: true });
      }
    })();
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Gift className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-xl font-bold">招待を確認しています…</h1>
        <p className="text-sm text-muted-foreground">
          Collectifyへようこそ！登録すると50ポイントもらえます🎁
        </p>
        <Skeleton className="h-2 w-full" />
      </div>
    </div>
  );
}
