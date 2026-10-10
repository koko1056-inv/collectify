import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { NavCountBadge } from "@/components/navigation/NavCountBadge";

/**
 * ヘッダーのメッセージ入口（未読バッジ付き）。
 * 以前は設定シートの奥にしか入口がなく、交換の連絡を見落としやすかった。
 * 形（40pxの丸・アイコン20px）とバッジは通知のベルと同じにする。
 */
export function MessagesNavButton({ unreadCount, className }: { unreadCount: number; className?: string }) {
  const { t } = useLanguage();
  const label =
    unreadCount > 0 ? t("chrome.nav.messagesUnread", { n: unreadCount }) : t("chrome.nav.messages");
  return (
    <Link
      to="/messages"
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted",
        className,
      )}
    >
      <MessageCircle className="h-5 w-5" />
      <NavCountBadge count={unreadCount} />
    </Link>
  );
}
