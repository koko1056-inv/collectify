import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  COMMON_SOURCES,
  GOODS_GROUPS,
  leavesOfGroup,
  type CatalogChipFilter,
  type ChipCounts,
  type GoodsGroupKey,
} from "@/lib/goodsTaxonomy";

interface ContentOption {
  id: string;
  name: string;
}

interface CatalogFilterChipsProps {
  /** 作品の一覧（推しの作品が先頭に来るよう並べたもの） */
  contents: ContentOption[];
  /** 作品ごとのグッズ数（catalog_content_counts）。無ければ件数を出さない */
  contentCounts?: Map<string, number>;
  selectedContent: string;
  onContentChange: (content: string) => void;
  filter: CatalogChipFilter;
  onFilterChange: (filter: CatalogChipFilter) => void;
  /** 今の一覧（作品・キーワードで絞った後）から数えた件数 */
  counts: ChipCounts;
  /**
   * 件数が「その作品の全件」から数えたものか。作品を選んでいないときは数百件ずつしか読んでいないので、
   * 件数は出さず、キャラの段も出さない（全体の件数と誤解させない）。
   */
  countsComplete: boolean;
  /** 何か絞り込んでいるか（リセットを出すかどうか） */
  canReset: boolean;
  onReset: () => void;
}

/**
 * カタログの絞り込みチップ。作品 → キャラ → カテゴリ（大分類 → 小分類） → 入手方法 の順に、横スクロールの段で並べる。
 * スマホ（幅 390px）で親指で選べるよう、チップは高さ 32px 以上・段ごとに横スクロールにしてある。
 */
export function CatalogFilterChips({
  contents,
  contentCounts,
  selectedContent,
  onContentChange,
  filter,
  onFilterChange,
  counts,
  countsComplete,
  canReset,
  onReset,
}: CatalogFilterChipsProps) {
  const { t } = useLanguage();
  const activeContent = selectedContent && selectedContent !== "all" ? selectedContent : null;
  const groupLabel = (key: GoodsGroupKey) => t(`catalogFilters.groups.${key}`);

  const characters = useMemo(
    () => [...counts.characters.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja")),
    [counts.characters]
  );

  // 件数が取れるときは、その作品に1件も無い大分類は出さない（選んでいるものは残す）
  const groups = useMemo(
    () => GOODS_GROUPS.filter((g) => !countsComplete || (counts.groups.get(g.key) ?? 0) > 0 || filter.group === g.key),
    [countsComplete, counts.groups, filter.group]
  );

  const leaves = useMemo(() => {
    if (!filter.group) return [];
    const base = leavesOfGroup(filter.group);
    if (!countsComplete) return base.map((name) => [name, undefined] as const);
    const known = [...counts.leaves.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"));
    if (filter.leaf && !counts.leaves.has(filter.leaf)) known.push([filter.leaf, 0]);
    return known;
  }, [filter.group, filter.leaf, countsComplete, counts.leaves]);

  const sources = useMemo(() => {
    if (countsComplete) {
      const list = [...counts.sources.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"));
      if (filter.source && !counts.sources.has(filter.source)) list.push([filter.source, 0]);
      return list.map(([name, n]) => [name, n] as const);
    }
    const names = [...new Set([...COMMON_SOURCES, ...counts.sources.keys(), ...(filter.source ? [filter.source] : [])])];
    return names.map((name) => [name, undefined] as const);
  }, [countsComplete, counts.sources, filter.source]);

  const set = (patch: Partial<CatalogChipFilter>) => onFilterChange({ ...filter, ...patch });
  const n = (v: number | undefined) => (countsComplete ? v : undefined);

  return (
    <div className="space-y-1.5" role="group" aria-label={t("catalogFilters.label")}>
      <ChipRow label={t("catalogFilters.rows.content")} activeKey={activeContent}>
        <Chip active={!activeContent} onClick={() => onContentChange("all")}>
          {t("catalogFilters.all")}
        </Chip>
        {contents.map((c) => (
          <Chip
            key={c.id}
            active={activeContent === c.name}
            count={contentCounts?.get(c.name)}
            onClick={() => onContentChange(activeContent === c.name ? "all" : c.name)}
          >
            {c.name}
          </Chip>
        ))}
      </ChipRow>

      <ChipRow label={t("catalogFilters.rows.character")} activeKey={`${activeContent}|${filter.character ?? ""}`}>
        {!activeContent || !countsComplete ? (
          <Hint>{t("catalogFilters.pickContentFirst")}</Hint>
        ) : characters.length === 0 ? (
          <Hint>{t("catalogFilters.noCharacters")}</Hint>
        ) : (
          <>
            <Chip active={!filter.character} onClick={() => set({ character: null })}>
              {t("catalogFilters.all")}
            </Chip>
            {characters.map(([name, count]) => (
              <Chip
                key={name}
                active={filter.character === name}
                count={count}
                onClick={() => set({ character: filter.character === name ? null : name })}
              >
                {name}
              </Chip>
            ))}
          </>
        )}
      </ChipRow>

      <ChipRow label={t("catalogFilters.rows.category")} activeKey={filter.group}>
        <Chip active={!filter.group} onClick={() => set({ group: null, leaf: null })}>
          {t("catalogFilters.all")}
        </Chip>
        {groups.map((g) => (
          <Chip
            key={g.key}
            active={filter.group === g.key}
            count={n(counts.groups.get(g.key) ?? 0)}
            onClick={() => set(filter.group === g.key ? { group: null, leaf: null } : { group: g.key, leaf: null })}
          >
            {groupLabel(g.key)}
          </Chip>
        ))}
      </ChipRow>

      {filter.group && (
        // 大分類を選んだら、その中の小分類（タグ名）を1段下に出す
        <ChipRow label="" nested activeKey={`${filter.group}|${filter.leaf ?? ""}`}>
          <Chip size="sm" active={!filter.leaf} onClick={() => set({ leaf: null })}>
            {t("catalogFilters.allInGroup", { group: groupLabel(filter.group) })}
          </Chip>
          {leaves.map(([name, count]) => (
            <Chip
              key={name}
              size="sm"
              active={filter.leaf === name}
              count={n(count)}
              onClick={() => set({ leaf: filter.leaf === name ? null : name })}
            >
              {name}
            </Chip>
          ))}
        </ChipRow>
      )}

      <ChipRow label={t("catalogFilters.rows.source")} activeKey={filter.source}>
        <Chip active={!filter.source} onClick={() => set({ source: null })}>
          {t("catalogFilters.all")}
        </Chip>
        {sources.map(([name, count]) => (
          <Chip
            key={name}
            active={filter.source === name}
            count={n(count)}
            onClick={() => set({ source: filter.source === name ? null : name })}
          >
            {name}
          </Chip>
        ))}
      </ChipRow>

      {canReset && (
        <div className="-mt-0.5 flex justify-end px-1">
          <button
            type="button"
            onClick={onReset}
            className="tap-safe-y inline-flex h-7 items-center gap-1 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("catalogFilters.reset")}
          </button>
        </div>
      )}
    </div>
  );
}

function ChipRow({
  label,
  nested,
  activeKey,
  children,
}: {
  label: string;
  nested?: boolean;
  /** 選んでいるものが変わったら、そのチップが見える位置まで横にずらす（リセットで「すべて」が半分隠れたままにならないように） */
  activeKey?: string | null;
  children: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scroller = scrollerRef.current;
    const chip = scroller?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!scroller || !chip) return;
    // scrollIntoView は縦にも画面を動かしてしまうので、横だけ自分で合わせる
    const left = chip.offsetLeft - scroller.offsetLeft;
    const right = left + chip.offsetWidth;
    if (left < scroller.scrollLeft) scroller.scrollTo({ left: Math.max(0, left - 8), behavior: "smooth" });
    else if (right > scroller.scrollLeft + scroller.clientWidth)
      scroller.scrollTo({ left: right - scroller.clientWidth + 8, behavior: "smooth" });
  }, [activeKey]);
  return (
    <div className={cn("flex items-center gap-2", nested && "-mt-0.5")}>
      <span className={cn("w-14 shrink-0 text-2xs font-bold text-muted-foreground", nested && "invisible")} aria-hidden={nested}>
        {label}
      </span>
      <div ref={scrollerRef} className="scrollbar-hide relative -mr-2 flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5 pr-2">
        {children}
      </div>
    </div>
  );
}

function Chip({
  active,
  count,
  size = "md",
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  size?: "md" | "sm";
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
        size === "md" ? "h-8 px-3 text-xs" : "h-7 px-2.5 text-2xs",
        active
          ? "border-primary bg-primary font-bold text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-muted"
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn("tabular-nums", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {count.toLocaleString()}
        </span>
      )}
    </button>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <span className="flex h-8 items-center whitespace-nowrap text-2xs text-muted-foreground">{children}</span>;
}
