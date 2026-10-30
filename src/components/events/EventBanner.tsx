import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useActivePostEvents, usePostEventStats } from "@/hooks/usePostEvents";
import { daysLeft, eventColor, type PostEvent, type PostEventStats } from "@/types/postEvents";

/**
 * 開催中のお題イベントの帯。「みんな」の最初の画面と、投稿タブのいちばん上に置く。
 * スマホは1枚ずつ横にスワイプ（次のカードの端が見える幅）。下の点で、いま何枚目か・ほかに何枚あるかがわかる。
 * 広い画面は横にスクロールさせず、ぜんぶを並べる（3つなら3列、それ以外は2列。4つなら2×2）。
 * 並びは締め切りが近い順（useActivePostEvents）。開催中のイベントが無いときは何も出さない（空の枠を見せない）。
 */
export function EventBanner({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { data: events, isLoading } = useActivePostEvents();
  const stats = usePostEventStats(events.map((e) => e.id));

  const listRef = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);
  const count = events.length;

  // スマホの横スワイプで、いちばん左に見えているカードの番号を点に映す
  useEffect(() => {
    const el = listRef.current;
    if (!el || count < 2) return;
    const onScroll = () => {
      const first = el.firstElementChild as HTMLElement | null;
      if (!first) return;
      const step = first.offsetWidth + 12; // gap-3
      // 最後まで送ったときは、最後のカードを「いま」にする（最後の1枚は左端まで来ないため）
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      setCurrent(atEnd ? count - 1 : Math.min(count - 1, Math.round(el.scrollLeft / step)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [count]);

  if (isLoading) {
    return (
      <div className={cn("flex gap-3 overflow-hidden", className)}>
        <Skeleton className="h-[104px] w-[85%] shrink-0 rounded-2xl sm:w-[calc(50%-6px)]" />
        <Skeleton className="h-[104px] w-[85%] shrink-0 rounded-2xl sm:w-[calc(50%-6px)]" />
      </div>
    );
  }
  if (count === 0) return null;

  const scrollTo = (i: number) => {
    const el = listRef.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft - 16, behavior: "smooth" });
  };

  return (
    <section aria-label={t("postEvents.bannerAria")} className={className} data-testid="event-banner" data-tour="post-events">
      <ul
        ref={listRef}
        className={cn(
          "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          // 広い画面は横スクロールをやめて並べる
          "sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0",
          count === 1 ? "sm:grid-cols-1" : "sm:grid-cols-2",
          count === 3 && "lg:grid-cols-3"
        )}
      >
        {events.map((e) => (
          <li key={e.id} className={cn("shrink-0 snap-start sm:w-auto", count === 1 ? "w-full" : "w-[85%]")}>
            <EventCard event={e} stats={stats.data?.get(e.id)} />
          </li>
        ))}
      </ul>
      {count > 1 && (
        <div className="mt-2 flex justify-center gap-1.5 sm:hidden" aria-hidden="true">
          {events.map((e, i) => (
            <button
              key={e.id}
              type="button"
              tabIndex={-1}
              onClick={() => scrollTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all motion-reduce:transition-none",
                i === current ? "w-4" : "w-1.5 bg-muted-foreground/25"
              )}
              style={i === current ? { backgroundColor: eventColor(e) } : undefined}
            />
          ))}
        </div>
      )}
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
