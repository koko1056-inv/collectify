import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  countFacets,
  type FacetKind,
  type FacetCount,
} from "@/utils/itemFacets";
import type { SeriesProgress } from "@/hooks/useCollectionProgress";
import { CompletionTargets } from "./CompletionTargets";

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
  /** 棚の持ち主。コンプの的（キャラ単位など）を数えるのに使う */
  userId?: string | null;
  /** 自分の棚か。目標のピン留め・「あと1個」の追加は自分の棚だけ */
  isOwn?: boolean;
}

const KINDS: FacetKind[] = ["series", "character", "type", "source"];
const COLLAPSED_COUNT = 10;

export function CollectionExplorer({
  items,
  progress,
  facet,
  onFacetChange,
  onShareSeries,
  userId,
  isOwn = false,
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

  const isSelected = (k: FacetKind, v: string) =>
    facet?.kind === k && facet.value.toLowerCase() === v.toLowerCase();

  const toggle = (k: FacetKind, v: string) =>
    onFacetChange(isSelected(k, v) ? null : { kind: k, value: v });

  return (
    <div className="space-y-3" data-tour="collection-explorer">
      {/* コンプの的。作品全体の大きな分母より、シリーズ・キャラの小さな的を主役にする */}
      <CompletionTargets
        userId={userId}
        items={items}
        progress={progress}
        isOwn={isOwn}
        isSelected={isSelected}
        onToggleFacet={toggle}
        onShareSeries={onShareSeries}
      />

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
                <span className="ml-1 tabular-nums text-3xs opacity-70">{counts[k].length}</span>
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
                  <span className={cn("tabular-nums text-3xs", selected ? "opacity-80" : "text-muted-foreground")}>
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
