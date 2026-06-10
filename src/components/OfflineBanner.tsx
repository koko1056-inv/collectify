import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// オフライン時に画面上部へバナーを表示し、復帰時にトーストで知らせる。
// queryClient は networkMode: 'online' のため、オフライン中は通信が走らず
// 無言で止まる — ユーザーに状態を可視化するのが目的。
export function OfflineBanner() {
  const { t } = useLanguage();
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      toast.success(t("system.backOnline"), { id: "network-status" });
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [t]);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-[100] bg-destructive text-destructive-foreground text-xs text-center py-1.5 px-4 pt-[max(0.375rem,env(safe-area-inset-top))] flex items-center justify-center gap-1.5"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>{t("system.offline")}</span>
    </div>
  );
}
