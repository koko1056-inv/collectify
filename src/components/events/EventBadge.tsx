import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePostEvents } from "@/hooks/usePostEvents";
import { eventColor } from "@/types/postEvents";

/**
 * 投稿に付く「お題」の札（例: 🧍 #推しのアクスタ集合）。押すとお題のページへ。
 * イベントの一覧はまとめて1回だけ読んでキャッシュしているので、カードごとに問い合わせない。
 */
export function EventBadge({ eventId, className }: { eventId: string | null | undefined; className?: string }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: events } = usePostEvents();
  const event = eventId ? events?.find((e) => e.id === eventId) : undefined;
  // そのお題のページの中では、どの投稿にも同じ札が付くだけなので出さない
  if (!event || pathname === `/event/${event.id}`) return null;
  const color = eventColor(event);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/event/${event.id}`);
      }}
      aria-label={t("postEvents.badgeAria", { tag: event.hashtag })}
      className={cn(
        "mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-bold transition-colors hover:brightness-95",
        className
      )}
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
    >
      <span aria-hidden="true">{event.emoji || "#"}</span>
      <span className="truncate">#{event.hashtag}</span>
    </button>
  );
}
