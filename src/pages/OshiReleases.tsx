import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles, Star, CalendarClock } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { IconTile } from "@/components/ui/icon-tile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOshiContents } from "@/hooks/useOshiContents";
import {
  addDays,
  jstDate,
  todayJst,
  useOshiNewArrivals,
  useOshiNewBadge,
  useReleasesInRange,
  useUpcomingReleases,
  type ReleaseItem,
} from "@/hooks/useOshiReleases";
import { ReleaseGoodsTile } from "@/components/releases/ReleaseGoodsTile";
import { shortDate, useReleaseActions, type ReleaseActions } from "@/hooks/useReleaseActions";
import { cn } from "@/lib/utils";

type Tab = "week" | "calendar" | "new";
const TABS: Tab[] = ["week", "calendar", "new"];

/** 「10月16日（金）」/「Fri, Oct 16」。日付だけの計算なので UTC で扱う */
function dayLabel(date: string, lang: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (lang === "en") return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const wd = "日月火水木金土"[d.getUTCDay()];
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${wd}）`;
}

function groupBy<T>(rows: T[], key: (r: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return [...m.entries()];
}

/**
 * 推しの新商品（/releases）。
 *
 * 推し活の人にとって「推しの新商品の情報」は義務ではなく知りたいもの。カタログには毎日自動で新商品が入るので、
 * それを推しの作品で絞って見せ、毎日開く「自分の外の理由」にする。
 *  - 今週発売: 今日から7日間に発売されるもの（日ごと）。何も無い週は「このあとの発売」を出す
 *  - カレンダー: 月の表。発売のある日に件数。日を押すとその日のグッズ
 *  - 新着: カタログに新しく入ったもの（直近14日）。前に見たとき以降のものに「NEW」
 * 以前はコレクション画面の「新着」ボタンが小さなダイアログ（直近72時間・推しの新着だけ）を開いていた。
 * それをこの画面にまとめた（ボタンはこの画面への入口になった）。
 * 推しの作品をまだ選んでいない人には、カタログ全体の新着・発売予定を見せ、作品を選ぶ入口を出す。
 */
export default function OshiReleases() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { names, ready } = useOshiContents();
  const badge = useOshiNewBadge();
  // 前に見た時刻は、開いた時点のものを覚えておく（新着タブで「見た」にしても、この画面の NEW の印は消さない）
  const [seenAtOpen] = useState<string | null>(() => badge.seenAt);
  const actions = useReleaseActions();

  const rawTab = params.get("tab");
  // 既定は「今週発売」。まだ見ていない新着があるときは、入口（コレクションの「新着」）が ?tab=new で開く
  const tab: Tab = (TABS as string[]).includes(rawTab ?? "") ? (rawTab as Tab) : "week";
  const picked = params.get("content");
  const content = picked && names.includes(picked) ? picked : null;
  const contents = content ? [content] : names;

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  // 新着を開いたら「見た」にする（コレクション画面のバッジが消える）
  useEffect(() => {
    if (tab === "new" && badge.hasOshi) badge.markSeen();
    // markSeen は uid が変わらない限り同じ。タブを開いた時だけ動かす
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, badge.hasOshi]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pt-6 sm:pb-10">
        <header className="pb-3">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
            {t("discover.releases.title")}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {names.length > 0 ? t("discover.releases.subtitle") : t("discover.releases.subtitleAll")}
          </p>
        </header>

        {ready && names.length === 0 && (
          // 推しの作品が無いと、カタログ全体の新商品になる。作品を選べば絞れることを伝える
          <button
            type="button"
            onClick={() => navigate("/me")}
            data-testid="releases-pick-oshi"
            className="mb-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-left hover:bg-primary/10"
          >
            <IconTile size="sm" tone="primary">
              <Star />
            </IconTile>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t("discover.releases.pickOshiTitle")}</span>
              <span className="block text-xs text-muted-foreground">{t("discover.releases.pickOshiDesc")}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        )}

        {names.length > 1 && (
          <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-hide" role="group" aria-label={t("discover.releases.filterAria")}>
            <Chip active={!content} onClick={() => setParam("content", null)}>
              {t("discover.releases.allOshi")}
            </Chip>
            {names.map((n) => (
              <Chip key={n} active={content === n} onClick={() => setParam("content", n)}>
                {n}
              </Chip>
            ))}
          </div>
        )}

        <div role="tablist" aria-label={t("discover.releases.tabsAria")} className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {TABS.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={tab === v}
              data-testid={`releases-tab-${v}`}
              onClick={() => setParam("tab", v)}
              className={cn(
                "relative rounded-lg px-1 py-2 text-xs font-bold transition-colors sm:text-sm",
                tab === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(`discover.releases.tab.${v}`)}
              {v === "new" && badge.unseen > 0 && tab !== "new" && (
                <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-3xs font-bold leading-4 text-primary-foreground tabular-nums">
                  {badge.unseen > 99 ? "99+" : badge.unseen}
                </span>
              )}
            </button>
          ))}
        </div>

        {!ready ? (
          <TileGridSkeleton />
        ) : tab === "week" ? (
          <WeekView contents={contents} actions={actions} lang={language} />
        ) : tab === "calendar" ? (
          <CalendarView contents={contents} actions={actions} lang={language} />
        ) : (
          <NewView contents={contents} actions={actions} lang={language} seenAt={seenAtOpen} />
        )}
      </main>
      {actions.detail}
      <Footer />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
      )}
    >
      {children}
    </button>
  );
}

function TileGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
      ))}
    </div>
  );
}

function TileGrid({ items, actions, meta, isNew }: { items: ReleaseItem[]; actions: ReleaseActions; meta?: (i: ReleaseItem) => string; isNew?: (i: ReleaseItem) => boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
      {items.map((item) => (
        <ReleaseGoodsTile key={item.id} item={item} actions={actions} meta={meta?.(item)} isNew={isNew?.(item)} />
      ))}
    </div>
  );
}

function DaySection({ title, today, count, children }: { title: string; today?: boolean; count: number; children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <section className="space-y-2">
      <h2 className="flex items-baseline gap-2 text-sm font-bold">
        {title}
        {today && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-3xs font-bold text-primary">{t("discover.releases.today")}</span>}
        <span className="text-2xs font-normal text-muted-foreground tabular-nums">{t("discover.releases.count", { n: count })}</span>
      </h2>
      {children}
    </section>
  );
}

/** 今日から7日間の発売。何も無い週は、このあといちばん近い発売を出す */
function WeekView({ contents, actions, lang }: { contents: string[]; actions: ReleaseActions; lang: string }) {
  const { t } = useLanguage();
  const today = todayJst();
  const end = addDays(today, 6);
  const week = useReleasesInRange(contents, today, end);
  const groups = useMemo(() => groupBy(week.data ?? [], (r) => r.release_date ?? ""), [week.data]);
  const empty = week.isSuccess && groups.length === 0;
  const later = useUpcomingReleases(contents, addDays(today, 7), 12, empty);

  if (week.isLoading) return <TileGridSkeleton />;
  if (week.isError) return <QueryErrorState title={t("discover.releases.loadFailed")} onRetry={() => void week.refetch()} />;

  return (
    <div className="space-y-5" data-testid="releases-week">
      {groups.map(([date, items]) => (
        <DaySection key={date} title={dayLabel(date, lang)} today={date === today} count={items.length}>
          <TileGrid items={items} actions={actions} meta={(i) => i.content_name ?? ""} />
        </DaySection>
      ))}
      {empty && (
        <>
          <EmptyState icon={CalendarClock} className="py-6" title={t("discover.releases.weekEmpty")} description={t("discover.releases.weekEmptyDesc")} />
          {(later.data?.length ?? 0) > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-bold">{t("discover.releases.later")}</h2>
              <TileGrid items={later.data!} actions={actions} meta={(i) => `${shortDate(i.release_date)} · ${i.content_name ?? ""}`} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** 月の表（スマホでも1画面に入る7列）。日を押すと、その日のグッズを下に出す */
function CalendarView({ contents, actions, lang }: { contents: string[]; actions: ReleaseActions; lang: string }) {
  const { t } = useLanguage();
  const today = todayJst();
  const [month, setMonth] = useState(today.slice(0, 7));
  // 押して選んだ日。選ぶまでは、今日以降でいちばん近い発売日を開いておく
  const [selected, setSelected] = useState<string | null>(null);
  const first = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  const lead = new Date(`${first}T00:00:00Z`).getUTCDay();
  const q = useReleasesInRange(contents, first, last);

  const byDay = useMemo(() => {
    const map = new Map<string, ReleaseItem[]>();
    for (const r of q.data ?? []) {
      if (!r.release_date) continue;
      const list = map.get(r.release_date);
      if (list) list.push(r);
      else map.set(r.release_date, [r]);
    }
    return map;
  }, [q.data]);

  // 選んだ日があればその日（発売が無い日でも「無い」と見せる）。選ぶ前は、今日以降でいちばん近い発売日
  // （この月に無ければ月の最初の発売日）
  const effective = useMemo(() => {
    if (selected && selected.startsWith(month)) return selected;
    const days = [...byDay.keys()].sort();
    return days.find((d) => d >= today) ?? days[0] ?? null;
  }, [selected, month, byDay, today]);

  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(d.toISOString().slice(0, 7));
    setSelected(null);
  };
  const monthLabel = lang === "en"
    ? new Date(`${first}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    : `${y}年${m}月`;
  const weekdays = lang === "en" ? ["S", "M", "T", "W", "T", "F", "S"] : ["日", "月", "火", "水", "木", "金", "土"];
  const dayItems = effective ? byDay.get(effective) ?? [] : [];

  return (
    <div className="space-y-4" data-testid="releases-calendar">
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(-1)} aria-label={t("discover.releases.prevMonth")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-bold tabular-nums">{monthLabel}</p>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(1)} aria-label={t("discover.releases.nextMonth")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdays.map((w, i) => (
            <span key={i} className={cn("pb-1 text-3xs font-bold text-muted-foreground", i === 0 && "text-destructive/80", i === 6 && "text-info")}>
              {w}
            </span>
          ))}
          {Array.from({ length: lead }).map((_, i) => (
            <span key={`lead-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, "0")}`;
            const n = byDay.get(date)?.length ?? 0;
            const isSel = date === effective;
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelected(date)}
                aria-pressed={isSel}
                aria-label={t("discover.releases.dayAria", { day: dayLabel(date, lang), n })}
                className={cn(
                  "flex aspect-square min-h-10 flex-col items-center justify-center rounded-lg text-xs tabular-nums transition-colors sm:aspect-auto sm:h-14",
                  isSel ? "bg-primary text-primary-foreground" : n > 0 ? "bg-primary/10 hover:bg-primary/15" : "text-muted-foreground hover:bg-muted",
                  date === today && !isSel && "ring-2 ring-primary/60"
                )}
              >
                <span className={cn("leading-none", n > 0 && "font-bold")}>{i + 1}</span>
                {n > 0 && <span className={cn("mt-0.5 text-3xs leading-none", isSel ? "text-primary-foreground/90" : "text-primary")}>{n > 99 ? "99+" : n}</span>}
              </button>
            );
          })}
        </div>
        {q.isLoading && <p className="mt-2 text-center text-2xs text-muted-foreground">{t("chrome.common.loading")}</p>}
      </div>

      {q.isError ? (
        <QueryErrorState title={t("discover.releases.loadFailed")} onRetry={() => void q.refetch()} />
      ) : q.isSuccess && byDay.size === 0 ? (
        <EmptyState icon={CalendarClock} className="py-6" title={t("discover.releases.monthEmpty")} description={t("discover.releases.monthEmptyDesc")} />
      ) : effective && dayItems.length > 0 ? (
        <DaySection title={dayLabel(effective, lang)} today={effective === today} count={dayItems.length}>
          <TileGrid items={dayItems} actions={actions} meta={(i) => i.content_name ?? ""} />
        </DaySection>
      ) : effective ? (
        <p className="py-4 text-center text-xs text-muted-foreground">{t("discover.releases.dayEmpty", { day: dayLabel(effective, lang) })}</p>
      ) : null}
    </div>
  );
}

/** カタログに新しく入ったもの（直近14日）を、入った日ごとに */
function NewView({ contents, actions, lang, seenAt }: { contents: string[]; actions: ReleaseActions; lang: string; seenAt: string | null }) {
  const { t } = useLanguage();
  const q = useOshiNewArrivals(contents, 14, 90);
  const today = todayJst();
  const groups = useMemo(() => groupBy(q.data?.items ?? [], (r) => jstDate(r.created_at)), [q.data]);
  // 初めて開いた人（前に見た時刻が無い）には、直近3日のものに印を付ける
  const seenMs = seenAt ? Date.parse(seenAt) : Date.now() - 72 * 3600e3;

  if (q.isLoading) return <TileGridSkeleton />;
  if (q.isError) return <QueryErrorState title={t("discover.releases.loadFailed")} onRetry={() => void q.refetch()} />;
  if (groups.length === 0) {
    return <EmptyState icon={Sparkles} className="py-8" title={t("discover.releases.newEmpty")} description={t("discover.releases.newEmptyDesc")} />;
  }

  const label = (date: string) =>
    date === today ? t("discover.releases.addedToday") : date === addDays(today, -1) ? t("discover.releases.addedYesterday") : dayLabel(date, lang);

  return (
    <div className="space-y-5" data-testid="releases-new">
      {groups.map(([date, items]) => (
        <DaySection key={date} title={label(date)} count={items.length}>
          <TileGrid
            items={items}
            actions={actions}
            meta={(i) => (i.release_date ? `${t("discover.releases.releaseOn", { date: shortDate(i.release_date) })} · ${i.content_name ?? ""}` : i.content_name ?? "")}
            isNew={(i) => Date.parse(i.created_at) > seenMs}
          />
        </DaySection>
      ))}
      {(q.data?.total ?? 0) > (q.data?.items.length ?? 0) && (
        <p className="text-center text-xs text-muted-foreground">{t("discover.releases.newMore", { n: (q.data?.total ?? 0) - (q.data?.items.length ?? 0) })}</p>
      )}
    </div>
  );
}
