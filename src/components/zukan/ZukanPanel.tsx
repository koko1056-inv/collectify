import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Check, ChevronDown, LayoutGrid, Layers, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Pocke, PockeSays } from "@/components/pocke/Pocke";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCatalogCompletion } from "@/hooks/useCatalogCompletion";
import type { ZukanViewState } from "@/hooks/useZukanView";
import { completionPercent, isComplete, type CompletionRow, type CompletionSummary, type ZukanItemLike } from "@/utils/zukan";
import { cn } from "@/lib/utils";

interface ZukanPanelProps {
  zukan: ZukanViewState;
  /** 選んでいる作品（null = 作品を選んでいない一覧） */
  content: string | null;
  /** その作品の全グッズ（読み込み済みなら）。所持率の RPC が使えないときの代わりに数える */
  contentItems?: ZukanItemLike[];
  /** チップ・タグ・キーワードで作品の一部に絞っているか（一部だけ空でも「ぜんぶ持ってる」とは言わない） */
  narrowed?: boolean;
  /**
   * 所持率を外から渡す（キャラページなど、作品以外の範囲で数えるとき）。
   * 渡すと作品の所持率（get_catalog_completion）は読まない。content は見出しの名前として使う。
   */
  completion?: { summary: CompletionSummary | null; isLoading: boolean };
}

/**
 * カタログを図鑑として見るための帯。/search の絞り込みチップのすぐ下に出す。
 *  - 作品を選んでいるとき: 所持率のバー（内訳つき）・未所持だけ・一覧/シリーズ別
 *  - いつでも: 発売年のチップ
 * ゲストには所持の数を出さず、合計と登録のおすすめだけを出す。
 */
export function ZukanPanel({ zukan, content, contentItems, narrowed = false, completion }: ZukanPanelProps) {
  const { t } = useLanguage();
  return (
    <section aria-label={t("zukan.filter.viewLabel")} className="space-y-2 px-1">
      {content &&
        (completion ? (
          <CompletionCardView zukan={zukan} content={content} summary={completion.summary} isLoading={completion.isLoading} />
        ) : (
          <CompletionCard zukan={zukan} content={content} contentItems={contentItems} />
        ))}
      {zukan.years.length > 1 || zukan.year !== null ? <YearChips zukan={zukan} /> : null}
      {content && !narrowed && zukan.missingOnly && zukan.ownedIds && zukan.year === null && zukan.items.length === 0 && contentItems && (
        <PockeSays pose="celebrate" height={64} bubbleClassName="text-xs">
          {t("zukan.series.allMissingDone")}
        </PockeSays>
      )}
    </section>
  );
}

function CompletionCard({ zukan, content, contentItems }: { zukan: ZukanViewState; content: string; contentItems?: ZukanItemLike[] }) {
  const { summary, isLoading } = useCatalogCompletion(
    content,
    contentItems ?? [],
    !!contentItems,
    zukan.ownedIds,
    zukan.ownedUpdatedAt
  );
  return <CompletionCardView zukan={zukan} content={content} summary={summary} isLoading={isLoading} />;
}

/** 所持率のカード（見た目だけ）。作品の所持率でも、キャラページの所持率でも同じ形で出す */
function CompletionCardView({
  zukan,
  content,
  summary,
  isLoading,
}: {
  zukan: ZukanViewState;
  content: string;
  summary: CompletionSummary | null;
  isLoading: boolean;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const work = summary?.work ?? null;
  const owned = work?.owned ?? 0;
  const total = work?.total ?? 0;
  const pct = completionPercent(owned, total);
  const done = !zukan.isGuest && isComplete(owned, total);

  return (
    <div className="rounded-2xl border bg-card p-3 shadow-sm" data-zukan-completion>
      {isLoading || !work ? (
        <div className="space-y-2" aria-busy="true">
          <p className="text-2xs text-muted-foreground">{t("zukan.progress.loading")}</p>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ) : zukan.isGuest ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <BookOpen className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{t("zukan.progress.totalOnly", { content, total: total.toLocaleString() })}</span>
          </p>
          <PockeSays pose="wave" height={56} bubbleClassName="text-xs">
            <span className="block">{t("zukan.guest.nudge")}</span>
            <Button
              size="sm"
              className="mt-1.5 h-7 px-3 text-xs"
              onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)}
            >
              {t("zukan.guest.cta")}
            </Button>
          </PockeSays>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="flex min-w-0 items-center gap-1.5 text-sm font-bold">
              {done ? (
                <Trophy className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              ) : (
                <BookOpen className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              )}
              <span className="truncate">{t("zukan.progress.title", { content })}</span>
            </p>
            <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
              <span className="font-bold text-foreground">{t("zukan.progress.count", { owned: owned.toLocaleString(), total: total.toLocaleString() })}</span>
              <span className="ml-1.5 font-bold text-primary">{t("zukan.progress.percent", { n: pct })}</span>
            </p>
          </div>
          <Progress value={pct} className="h-2" aria-label={t("zukan.progress.title", { content })} />
          {done ? (
            <div className="flex items-center gap-1.5 pt-0.5">
              <Pocke pose="celebrate" height={36} motion="pop" />
              <p className="text-xs font-bold text-foreground">{t("zukan.progress.complete")}</p>
            </div>
          ) : total - owned > 0 && total - owned <= 5 ? (
            <p className="text-2xs font-bold text-primary">{t("zukan.progress.left", { n: total - owned })}</p>
          ) : null}
        </div>
      )}

      {/* 操作の行: 未所持だけ / 一覧・シリーズ別 / 内訳 */}
      <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {!zukan.isGuest && (
          <Chip active={zukan.missingOnly} onClick={() => zukan.setMissingOnly(!zukan.missingOnly)}>
            {zukan.missingOnly && <Check className="h-3 w-3" aria-hidden="true" />}
            {t("zukan.filter.missingOnly")}
          </Chip>
        )}
        <div role="group" aria-label={t("zukan.filter.viewLabel")} className="flex shrink-0 rounded-full border p-0.5">
          <SegButton active={!zukan.seriesView} onClick={() => zukan.setSeriesView(false)}>
            <LayoutGrid className="h-3 w-3" aria-hidden="true" />
            {t("zukan.filter.viewList")}
          </SegButton>
          <SegButton active={zukan.seriesView} onClick={() => zukan.setSeriesView(true)}>
            <Layers className="h-3 w-3" aria-hidden="true" />
            {t("zukan.filter.viewSeries")}
          </SegButton>
        </div>
        {summary && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="ml-auto inline-flex shrink-0 items-center gap-0.5 px-1 text-2xs font-medium text-muted-foreground hover:text-foreground"
          >
            {open ? t("zukan.progress.hideBreakdown") : t("zukan.progress.breakdown")}
            <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </button>
        )}
      </div>

      {open && summary && (
        <Breakdown
          guest={zukan.isGuest}
          groups={{ series: summary.series, character: summary.character, type: summary.type }}
        />
      )}
    </div>
  );
}

type BreakdownKind = "series" | "character" | "type";
const PAGE = 8;

function Breakdown({ groups, guest }: { groups: Record<BreakdownKind, CompletionRow[]>; guest: boolean }) {
  const { t } = useLanguage();
  const kinds = (["series", "character", "type"] as BreakdownKind[]).filter((k) => groups[k].length > 0);
  const [kind, setKind] = useState<BreakdownKind | null>(kinds[0] ?? null);
  const [shown, setShown] = useState(PAGE);
  const active = kind && kinds.includes(kind) ? kind : kinds[0] ?? null;

  if (!active) {
    return <p className="mt-2 text-2xs text-muted-foreground">{t("zukan.progress.noBreakdown")}</p>;
  }
  const rows = groups[active];
  return (
    <div className="mt-2 space-y-2 border-t pt-2">
      <div className="flex gap-1.5" role="tablist">
        {kinds.map((k) => (
          <Chip
            key={k}
            active={k === active}
            role="tab"
            aria-selected={k === active}
            onClick={() => {
              setKind(k);
              setShown(PAGE);
            }}
          >
            {t(`zukan.progress.${k}`)}
            <span className="tabular-nums opacity-70">{groups[k].length}</span>
          </Chip>
        ))}
      </div>
      <ul className="space-y-1.5">
        {rows.slice(0, shown).map((r) => {
          const pct = completionPercent(r.owned, r.total);
          const done = !guest && isComplete(r.owned, r.total);
          return (
            <li key={`${r.kind}:${r.label}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5">
              <span className="truncate text-xs">{r.label}</span>
              <span className={cn("text-2xs tabular-nums", done ? "font-bold text-warning" : "text-muted-foreground")}>
                {guest ? r.total.toLocaleString() : t("zukan.progress.rowCount", { owned: r.owned, total: r.total })}
              </span>
              {!guest && <Progress value={pct} className="col-span-2 h-1" />}
            </li>
          );
        })}
      </ul>
      {rows.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE * 2)}
          className="text-2xs font-medium text-primary underline-offset-2 hover:underline"
        >
          {t("zukan.progress.showMore", { n: rows.length - shown })}
        </button>
      )}
    </div>
  );
}

function YearChips({ zukan }: { zukan: ZukanViewState }) {
  const { t } = useLanguage();
  return (
    <div
      role="group"
      aria-label={t("zukan.filter.yearLabel")}
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-hide"
    >
      <Chip active={zukan.year === null} onClick={() => zukan.setYear(null)}>
        {t("zukan.filter.yearAll")}
      </Chip>
      {zukan.years.map((b) => (
        <Chip key={b.year} active={zukan.year === b.year} onClick={() => zukan.setYear(zukan.year === b.year ? null : b.year)}>
          {t("zukan.filter.year", { year: b.year })}
          <span className="tabular-nums opacity-70">{b.count}</span>
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={rest.role ? undefined : active}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-xs transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

function SegButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
