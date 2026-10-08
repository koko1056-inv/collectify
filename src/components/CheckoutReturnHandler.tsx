import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

// Stripe の決済ページから戻ってきたときの URL は /?checkout=success&kind=points のようになる。
// "/" はすぐ別の画面へ転送されて query が消えるので、読み込んだ時点の値を先に控えておく。
const initialParams = (() => {
  try {
    const p = new URLSearchParams(window.location.search);
    const result = p.get("checkout");
    if (!result) return null;
    return { result, kind: p.get("kind") };
  } catch {
    return null;
  }
})();

/**
 * 決済ページから戻ったら、結果を知らせて、プラン・ポイントの表示を引き直す。
 * 反映は Stripe の通知（Webhook）が行うので、数秒遅れることがある。数回に分けて引き直す。
 */
export function CheckoutReturnHandler() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!initialParams || !user?.id) return;
    const { result, kind } = initialParams;

    // 一度だけ処理する（画面の作り直しや再ログインでもう一度出さない）
    const marker = "__checkoutReturnHandled";
    const w = window as unknown as Record<string, boolean>;
    if (w[marker]) return;
    w[marker] = true;

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      url.searchParams.delete("kind");
      window.history.replaceState(window.history.state, "", url.toString());
    } catch {
      /* URL を整えられなくても致命的ではない */
    }

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["userPoints"] });
      queryClient.invalidateQueries({ queryKey: ["pointTransactions"] });
    };

    if (result === "success") {
      toast.success(t(kind === "points" ? "misc.checkout.successPoints" : "misc.checkout.successSubscription"));
    } else if (result === "cancel") {
      toast(t("misc.checkout.cancelled"));
      return;
    }
    refresh();
    const timers = [2000, 5000, 10000].map((ms) => window.setTimeout(refresh, ms));
    return () => timers.forEach(window.clearTimeout);
  }, [user?.id, queryClient, t]);

  return null;
}
