import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * ヘッダーのメッセージ入口（未読バッジ付き）。
 * 以前は設定シートの奥にしか入口がなく、交換の連絡を見落としやすかった。
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
      {unreadCount > 0 && (
        <span
          aria-hidden
          className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-3xs font-bold tabular-nums text-destructive-foreground"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
