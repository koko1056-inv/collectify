import { useMemo, useState } from "react";
import { Trophy, Share2, ChevronDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  countFacets,
  type FacetKind,
  type FacetCount,
} from "@/utils/itemFacets";
import {
  isComplete,
  progressPercent,
  type SeriesProgress,
} from "@/hooks/useCollectionProgress";

export interface CollectionFacet {
  kind: FacetKind;
  value: string;
}

interface CollectionExplorerProps {
  items: Parameters<typeof countFacets>[0];
  progress: SeriesProgress[];
  facet: CollectionFacet | null;
  onFacetChange: (f: CollectionFacet | null) => void;
  /** 作品カードのシェアボタン。渡されなければ非表示（他人のコレクションなど） */
  onShareSeries?: (p: SeriesProgress) => void;
}

const KINDS: FacetKind[] = ["series", "character", "type", "source"];
const COLLAPSED_COUNT = 10;

export function CollectionExplorer({
  items,
  progress,
  facet,
  onFacetChange,
  onShareSeries,
}: CollectionExplorerProps) {
  const { t } = useLanguage();
  const [kind, setKind] = useState<FacetKind>("series");
  const [expanded, setExpanded] = useState(false);

  const counts = useMemo(() => {
    const out = {} as Record<FacetKind, FacetCount[]>;
    for (const k of KINDS) out[k] = countFacets(items, k);
    return out;
  }, [items]);

  const availableKinds = KINDS.filter((k) => counts[k].length > 0);
  const activeKind = availableKinds.includes(kind) ? kind : availableKinds[0];
  const chips = activeKind ? counts[activeKind] : [];
  const visibleChips = expanded ? chips : chips.slice(0, COLLAPSED_COUNT);

  // 1件しかない作品は「進捗」として見せる意味が薄いので、2件以上のカタログがあるものだけ
  const progressCards = progress.filter((p) => p.total >= 2);

  const isSelected = (k: FacetKind, v: string) =>
    facet?.kind === k && facet.value.toLowerCase() === v.toLowerCase();

  const toggle = (k: FacetKind, v: string) =>
    onFacetChange(isSelected(k, v) ? null : { kind: k, value: v });

  return (
    <div className="space-y-3" data-tour="collection-explorer">
      {/* 作品ごとのコンプ進捗 */}
      {progressCards.length > 0 && (
        <section aria-label={t("engage.collection.progressTitle")} className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-bold">{t("engage.collection.progressTitle")}</h3>
            <span className="text-[11px] text-muted-foreground">
              {t("engage.collection.progressHint")}
            </span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide snap-x">
            {progressCards.map((p) => {
              const pct = progressPercent(p);
              const done = isComplete(p);
              const selected = isSelected("series", p.series_label);
              return (
                <div
                  key={p.series_label}
                  className={cn(
                    "snap-start shrink-0 w-[148px] rounded-2xl border bg-card overflow-hidden text-left transition-colors",
                    selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggle("series", p.series_label)}
                    className="block w-full text-left"
                    aria-pressed={selected}
                  >
                    <div className="relative h-20 bg-muted">
                      {p.cover_image && (
                        <img
                          src={p.cover_image}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                      {done && (
                        <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                          <Trophy className="h-3 w-3" />
                          {t("engage.collection.complete")}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 space-y-1.5">
                      <p className="text-xs font-semibold leading-tight line-clamp-2 min-h-[2rem]">
                        {p.series_label}
                      </p>
                      <Progress value={pct} className="h-1.5" />
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {t("engage.collection.ownedOf", { owned: p.owned, total: p.total })}
                        <span className="ml-1 font-semibold text-foreground">{pct}%</span>
                      </p>
                    </div>
                  </button>
                  {onShareSeries && (
                    <button
                      type="button"
                      onClick={() => onShareSeries(p)}
                      className="flex w-full items-center justify-center gap-1 border-t border-border py-1.5 text-[11px] font-medium text-primary hover:bg-primary/5"
                    >
                      <Share2 className="h-3 w-3" />
                      {t("engage.collection.shareSeries")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 作品 / キャラ / 種類 / 入手方法 で辿る */}
      {availableKinds.length > 0 && (
        <section className="space-y-2" aria-label={t("engage.collection.browseBy")}>
          <div className="flex items-center gap-1 rounded-full bg-muted p-1 w-fit" role="tablist">
            {availableKinds.map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={activeKind === k}
                onClick={() => {
                  setKind(k);
                  setExpanded(false);
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  activeKind === k
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t(`engage.collection.kind.${k}`)}
                <span className="ml-1 tabular-nums text-[10px] opacity-70">{counts[k].length}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {visibleChips.map((c) => {
              const selected = isSelected(activeKind, c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggle(activeKind, c.value)}
                  aria-pressed={selected}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <span className="max-w-[10rem] truncate">{c.value}</span>
                  <span className={cn("tabular-nums text-[10px]", selected ? "opacity-80" : "text-muted-foreground")}>
                    {c.count}
                  </span>
                </button>
              );
            })}
            {chips.length > COLLAPSED_COUNT && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs text-primary"
              >
                {expanded
                  ? t("engage.collection.showLess")
                  : t("engage.collection.showMore", { n: chips.length - COLLAPSED_COUNT })}
                <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
