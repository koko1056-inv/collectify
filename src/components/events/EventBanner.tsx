import { useNavigate } from "react-router-dom";
import { ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useActivePostEvents, usePostEventStats } from "@/hooks/usePostEvents";
import { daysLeft, eventColor, type PostEvent, type PostEventStats } from "@/types/postEvents";

/**
 * 開催中のお題イベントの帯。「みんな」の最初の画面と、投稿タブのいちばん上に置く。
 * スマホは1枚ずつ横にスワイプ（次のカードの端が見える幅）、広い画面は2〜3枚を並べる。
 * 開催中のイベントが無いときは何も出さない（空の枠を見せない）。
 */
export function EventBanner({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { data: events, isLoading } = useActivePostEvents();
  const stats = usePostEventStats(events.map((e) => e.id));

  if (isLoading) {
    return (
      <div className={cn("flex gap-3 overflow-hidden", className)}>
        <Skeleton className="h-[104px] w-[85%] shrink-0 rounded-2xl sm:w-[calc(50%-6px)]" />
        <Skeleton className="h-[104px] w-[85%] shrink-0 rounded-2xl sm:w-[calc(50%-6px)]" />
      </div>
    );
  }
  if (events.length === 0) return null;

  return (
    <section aria-label={t("postEvents.bannerAria")} className={className} data-testid="event-banner">
      <ul
        className={cn(
          "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "sm:mx-0 sm:px-0"
        )}
      >
        {events.map((e) => (
          <li
            key={e.id}
            className={cn(
              "w-[85%] shrink-0 snap-start",
              events.length === 1 ? "sm:w-full" : "sm:w-[calc(50%-6px)]",
              events.length >= 3 && "lg:w-[calc(33.333%-8px)]"
            )}
          >
            <EventCard event={e} stats={stats.data?.get(e.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EventCard({ event, stats }: { event: PostEvent; stats?: PostEventStats }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const color = eventColor(event);
  const left = daysLeft(event);
  const people = stats?.participantCount ?? 0;
  return (
    <button
      type="button"
      onClick={() => navigate(`/event/${event.id}`)}
      className="group relative flex h-[104px] w-full items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left transition-transform active:scale-[0.98] motion-reduce:transition-none"
      style={{
        borderColor: `${color}40`,
        background: `linear-gradient(120deg, ${color}26 0%, ${color}0d 55%, transparent 100%)`,
      }}
    >
      {/* 右上の大きな絵文字の透かし */}
      <span aria-hidden="true" className="pointer-events-none absolute -right-3 -top-4 select-none leading-none opacity-[0.13]" style={{ fontSize: 88 }}>
        {event.emoji}
      </span>
      <span
        aria-hidden="true"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-sm"
        style={{ backgroundColor: "white", boxShadow: `0 4px 14px -6px ${color}` }}
      >
        {event.emoji || "#"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-3xs font-bold" style={{ color }}>
          <span className="rounded-full px-1.5 py-px text-white" style={{ backgroundColor: color }}>
            {t("postEvents.label")}
          </span>
          <span>{left > 0 ? t("postEvents.daysLeft", { n: left }) : t("postEvents.lastDay")}</span>
        </span>
        <span className="mt-1 block truncate text-sm font-bold text-foreground">#{event.hashtag}</span>
        <span className="mt-0.5 flex items-center gap-1 text-2xs text-muted-foreground">
          <Users className="h-3 w-3 shrink-0" aria-hidden="true" />
          {people > 0 ? t("postEvents.participants", { n: people }) : t("postEvents.firstOne")}
        </span>
      </span>
      <span
        className="flex shrink-0 items-center gap-0.5 rounded-full px-2.5 py-1.5 text-2xs font-bold text-white shadow-sm transition-transform group-hover:translate-x-0.5"
        style={{ backgroundColor: color }}
      >
        {t("postEvents.join")}
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
      </span>
    </button>
  );
}
