import { useMemo, useState } from "react";
import { Check, ChevronDown, Trophy } from "lucide-react";
import type { OfficialItem } from "@/types";
import { MemoizedOfficialGoodsCard } from "@/components/official-goods/MemoizedOfficialGoodsCard";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { completionPercent, groupBySeries, isComplete, NO_SERIES_KEY } from "@/utils/zukan";
import { cn } from "@/lib/utils";

/** 最初に開いておくシリーズの数・一度に出すシリーズの数・開いたシリーズで最初に出すグッズの数 */
const OPEN_FIRST = 2;
const GROUP_PAGE = 30;
const ITEMS_FIRST = 12;

interface SeriesGroupedGridProps {
  /** 並べ替え・絞り込み済みのグッズ（この順のままシリーズの中に並べる） */
  items: OfficialItem[];
  /** 自分の所持 id（ゲストは null。「3/8 所持」を出さず件数だけにする） */
  ownedIds: ReadonlySet<string> | null;
  ownerCounts?: Record<string, number>;
}

/**
 * シリーズ別まとめ表示（/search?view=series）。ガチャ・くじ・カード弾のように
 * キャラごとに 1 件ずつ登録されたグッズを、シリーズの箱にまとめて「3/8 所持」を出す。
 * 作品を選んでいるときだけ使う（全件が手元にあるので、数がずれない）。
 * 1 万件ある作品でも重くならないよう、箱は閉じて並べ、開いた箱だけカードを描く。
 */
export function SeriesGroupedGrid({ items, ownedIds, ownerCounts }: SeriesGroupedGridProps) {
  const { t } = useLanguage();
  const groups = useMemo(() => groupBySeries(items, ownedIds), [items, ownedIds]);
  const [shownGroups, setShownGroups] = useState(GROUP_PAGE);
  // 開閉は箱のキーで覚える（並べ替えても開いたまま）。最初は上から OPEN_FIRST 個を開く
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-2 px-1" data-zukan-series>
      {groups.slice(0, shownGroups).map((g, index) => {
        const open = toggled[g.key] ?? index < OPEN_FIRST;
        const done = !!ownedIds && isComplete(g.owned, g.total);
        const visible = expanded[g.key] ? g.items : g.items.slice(0, ITEMS_FIRST);
        const label = g.key === NO_SERIES_KEY ? t("zukan.series.noSeries") : g.label;
        return (
          <section key={g.key} className={cn("overflow-hidden rounded-2xl border bg-card", done && "border-warning/60")}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setToggled((m) => ({ ...m, [g.key]: !open }))}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
            >
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex items-center gap-1.5">
                  {done && <Trophy className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />}
                  <span className="truncate text-sm font-bold">{label}</span>
                </span>
                {ownedIds && <Progress value={completionPercent(g.owned, g.total)} className="h-1" />}
              </span>
              <span className={cn("shrink-0 text-xs tabular-nums", done ? "font-bold text-warning" : "text-muted-foreground")}>
                {ownedIds ? (done ? t("zukan.series.complete") : t("zukan.series.owned", { owned: g.owned, total: g.total })) : g.total}
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
            </button>
            {open && (
              <div className="border-t px-1 pb-2 pt-1.5">
                <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
                  {visible.map((item) => {
                    const has = !!ownedIds?.has(item.id);
                    return (
                      <div key={item.id} className={cn("relative", ownedIds && !has && "opacity-60")}>
                        {has && (
                          <span className="pointer-events-none absolute left-1.5 top-1.5 z-20 inline-flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-3xs font-bold text-primary-foreground shadow">
                            <Check className="h-2.5 w-2.5" aria-hidden="true" />
                            {t("zukan.series.ownedBadge")}
                          </span>
                        )}
                        <MemoizedOfficialGoodsCard
                          id={item.id}
                          title={item.title}
                          image={item.image}
                          artist={item.artist}
                          anime={item.anime}
                          price={item.price}
                          releaseDate={item.release_date}
                          createdBy={item.created_by}
                          contentName={item.content_name}
                          ownersCount={ownerCounts?.[item.id] ?? 0}
                        />
                      </div>
                    );
                  })}
                </div>
                {g.items.length > visible.length && (
                  <button
                    type="button"
                    onClick={() => setExpanded((m) => ({ ...m, [g.key]: true }))}
                    className="mt-2 w-full text-center text-xs font-medium text-primary"
                  >
                    {t("zukan.series.showAllItems", { n: g.items.length })}
                  </button>
                )}
              </div>
            )}
          </section>
        );
      })}
      {groups.length > shownGroups && (
        <div className="flex justify-center py-2">
          <button
            type="button"
            onClick={() => setShownGroups((n) => n + GROUP_PAGE)}
            className="rounded-full border px-4 py-1.5 text-xs font-medium hover:bg-muted"
          >
            {t("zukan.series.showMoreGroups", { n: groups.length - shownGroups })}
          </button>
        </div>
      )}
    </div>
  );
}
