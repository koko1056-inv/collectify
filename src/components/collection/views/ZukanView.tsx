import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronDown, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/utils/optimized-image";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PockeSays } from "@/components/pocke/Pocke";
import { PickedItemModal, type PickedItem } from "./PickedItemModal";

/** 図鑑に並べる上限（get_zukan_series と同じ） */
const SERIES_LIMIT = 300;

interface ZukanSection {
  key: string;
  label: string;
  owned: number;
  total: number;
  cover: string | null;
}

interface ZukanViewProps {
  userId: string;
  isOwn: boolean;
  /** 持っているグッズが増えた・減ったら読み直すための目印（一覧の件数と最新の id） */
  version: string;
}

/**
 * 図鑑: シリーズごとに、カタログ全体を発売順の番号で並べる。
 * 持っているものはカラー、まだのものはシルエット。「あと何が足りないか」が一目で分かり、
 * シルエットをタップすると、そのグッズの詳細（登録・ほしい）へ進める。
 */
export function ZukanView({ userId, isOwn, version }: ZukanViewProps) {
  const { t } = useLanguage();
  const [openKey, setOpenKey] = useState<string | null | undefined>(undefined);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["zukan", "index", userId, version],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_zukan_index", { _user_id: userId });
      if (error) throw error;
      return (data ?? []) as ZukanSection[];
    },
    enabled: !!userId,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  // 並び: たくさん集めているシリーズが上。300 件を超える大きなシリーズは後ろ（コンプ間近はポッケが教える）
  const sections = useMemo(() => {
    const list = [...(data ?? [])];
    const big = (s: ZukanSection) => (s.total > SERIES_LIMIT ? 1 : 0);
    list.sort((a, b) => big(a) - big(b) || b.owned - a.owned || a.total - b.total);
    return list;
  }, [data]);

  // 最初は、いちばん上（いちばん集めている）のシリーズを開いておく
  const activeKey = openKey === undefined ? sections[0]?.key ?? null : openKey;

  const hint = useMemo(() => {
    const next = sections.find((s) => s.total <= SERIES_LIMIT && s.owned < s.total && s.total - s.owned <= 5);
    if (next) return { pose: "point" as const, text: t("collectionScreen.zukan.hintNext", { n: next.total - next.owned, name: next.label }) };
    const done = sections.filter((s) => s.owned >= s.total).length;
    if (done > 0) return { pose: "celebrate" as const, text: t("collectionScreen.zukan.hintComplete", { n: done }) };
    return { pose: "wink" as const, text: t("collectionScreen.zukan.hintStart") };
  }, [sections, t]);

  if (isLoading && !data) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }
  if (isError) {
    return <QueryErrorState title={t("collectionScreen.zukan.loadFailed")} onRetry={() => refetch()} />;
  }
  if (sections.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        pose="think"
        title={t("collectionScreen.zukan.emptyTitle")}
        description={t("collectionScreen.zukan.emptyDesc")}
      />
    );
  }

  return (
    <div className="space-y-3">
      {isOwn && (
        <PockeSays pose={hint.pose} height={64} reactKey={hint.text} bubbleClassName="text-sm">
          {hint.text}
        </PockeSays>
      )}

      {sections.map((s) => (
        <ZukanSeries
          key={s.key}
          section={s}
          userId={userId}
          isOwn={isOwn}
          version={version}
          open={activeKey === s.key}
          onToggle={() => setOpenKey(activeKey === s.key ? null : s.key)}
        />
      ))}

      <p className="px-1 text-xs text-muted-foreground">{t("collectionScreen.zukan.footnote")}</p>
    </div>
  );
}

function ZukanSeries({
  section,
  userId,
  isOwn,
  version,
  open,
  onToggle,
}: {
  section: ZukanSection;
  userId: string;
  isOwn: boolean;
  version: string;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useLanguage();
  const complete = section.owned >= section.total;
  const tooBig = section.total > SERIES_LIMIT;
  const pct = Math.min(100, Math.round((section.owned / Math.max(1, section.total)) * 100));

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border bg-card",
        complete && "border-points/50"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/40"
      >
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-muted">
          {section.cover && (
            <img
              src={getOptimizedImageUrl(section.cover, { width: 96 })}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )}
          {complete && (
            <span className="absolute inset-x-0 bottom-0 flex justify-center bg-points py-px">
              <Crown className="h-3 w-3 text-points-foreground" aria-hidden />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-sm font-bold">{section.label}</h3>
            {complete && (
              <span className="shrink-0 rounded-full bg-points-soft px-1.5 py-px text-3xs font-bold text-points">
                {t("collectionScreen.zukan.complete")}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", complete ? "bg-points" : "bg-primary")}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
              {section.owned}/{tooBig ? `${SERIES_LIMIT}+` : section.total}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && <ZukanGrid seriesKey={section.key} userId={userId} isOwn={isOwn} version={version} tooBig={tooBig} />}
    </section>
  );
}

function ZukanGrid({
  seriesKey,
  userId,
  isOwn,
  version,
  tooBig,
}: {
  seriesKey: string;
  userId: string;
  isOwn: boolean;
  version: string;
  tooBig: boolean;
}) {
  const { t } = useLanguage();
  const [picked, setPicked] = useState<PickedItem | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["zukan", "series", userId, seriesKey, version],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_zukan_series", { _key: seriesKey, _user_id: userId });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  if (isLoading && !data) {
    return (
      <div className="grid grid-cols-4 gap-2 border-t p-3 sm:grid-cols-6 md:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="border-t p-3">
        <QueryErrorState title={t("collectionScreen.zukan.loadFailed")} onRetry={() => refetch()} />
      </div>
    );
  }

  const digits = Math.max(3, String(data?.length ?? 0).length);

  return (
    <div className="border-t bg-muted/20 p-3">
      <ol className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {(data ?? []).map((m, i) => {
          const owned = !!m.user_item_id;
          const img = (owned ? m.user_image || m.image : m.image) ?? "";
          const no = t("collectionScreen.zukan.number", { n: String(i + 1).padStart(digits, "0") });
          return (
            <li key={m.official_item_id}>
              <button
                type="button"
                onClick={() =>
                  setPicked(
                    owned
                      ? { kind: "user", id: m.user_item_id!, title: m.title, image: img, ownerId: userId, isOwn }
                      : { kind: "official", id: m.official_item_id, title: m.title, image: m.image ?? "", releaseDate: m.release_date ?? undefined }
                  )
                }
                aria-label={owned ? `${no} ${m.title}` : `${no} ${t("collectionScreen.zukan.notYet")}`}
                className={cn(
                  "group relative block aspect-square w-full overflow-hidden rounded-xl transition-transform active:scale-95",
                  owned
                    ? "bg-card shadow-sm ring-1 ring-border"
                    : "border border-dashed border-muted-foreground/30 bg-muted/60"
                )}
              >
                {img && (
                  <img
                    src={getOptimizedImageUrl(img, { width: 200 })}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className={cn(
                      "h-full w-full object-cover transition",
                      // まだのものはぼかした影だけ見せる（写真は背景つきが多く、黒く塗ると四角になる）。何のグッズかはタップで分かる
                      !owned && "scale-110 opacity-40 [filter:grayscale(1)_blur(5px)] dark:opacity-30"
                    )}
                  />
                )}
                {!owned && (
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-muted-foreground/50">
                    ?
                  </span>
                )}
                <span
                  className={cn(
                    "absolute left-1 top-1 rounded-md px-1 py-px text-3xs font-bold tabular-nums",
                    owned ? "bg-background/85 text-foreground" : "text-muted-foreground/70"
                  )}
                >
                  {no}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {tooBig && <p className="mt-2 text-xs text-muted-foreground">{t("collectionScreen.zukan.overNote")}</p>}
      <PickedItemModal picked={picked} onClose={() => setPicked(null)} />
    </div>
  );
}
