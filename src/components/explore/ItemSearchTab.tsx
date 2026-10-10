import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Package, Plus, Repeat, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ItemOwnersModal } from "@/components/ItemOwnersModal";
import { cn } from "@/lib/utils";
import { addToCollection } from "@/utils/collection-actions";
import { copyTagsFromOfficialItem } from "@/utils/tag-operations";
import { invalidateCollectionChanged } from "@/utils/collection-cache";

interface ItemRow {
  id: string;
  title: string;
  image: string | null;
  content_name: string | null;
  owner_count: number;
  trade_count: number;
  i_own: boolean;
}

type Sort = "popular" | "name" | "trade";

interface ItemSearchTabProps {
  /** デバウンス済みの検索語 */
  query: string;
  onPickSuggestion: (text: string) => void;
}

/**
 * グッズを横断して探す。「このグッズ、誰が持ってる？」に答えるのが目的なので、
 * 結果には持っている人の数と、交換に出している人の数を必ず出す。
 */
export function ItemSearchTab({ query, onPickSuggestion }: ItemSearchTabProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sort, setSort] = useState<Sort>("popular");
  const [onlyTrade, setOnlyTrade] = useState(false);
  const [series, setSeries] = useState<string | null>(null);
  const [ownersFor, setOwnersFor] = useState<ItemRow | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const q = query.trim();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["explore-item-search", q, user?.id],
    queryFn: async (): Promise<ItemRow[]> => {
      const { data, error } = await supabase.rpc("search_official_items_with_owners", {
        _q: q,
        _limit: 60,
      });
      if (error) throw error;
      return (data ?? []) as ItemRow[];
    },
    enabled: !!user && q.length > 0,
    staleTime: 1000 * 30,
  });

  // 検索語が空のとき、何を打てばいいかの手がかりを出す
  const { data: suggestions = [] } = useQuery({
    queryKey: ["explore-search-suggestions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tags")
        .select("name, usage_count")
        .eq("category", "series")
        .eq("status", "approved")
        .neq("name", "なし")
        .order("usage_count", { ascending: false })
        .limit(12);
      return Array.from(new Set((data ?? []).map((r) => r.name)));
    },
    staleTime: 1000 * 60 * 10,
  });

  const seriesChips = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) if (r.content_name) m.set(r.content_name, (m.get(r.content_name) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [rows]);

  const shown = useMemo(() => {
    let list = rows;
    if (onlyTrade) list = list.filter((r) => r.trade_count > 0);
    if (series) list = list.filter((r) => r.content_name === series);
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.title.localeCompare(b.title, "ja"));
    else if (sort === "trade") sorted.sort((a, b) => b.trade_count - a.trade_count || b.owner_count - a.owner_count);
    else sorted.sort((a, b) => b.owner_count - a.owner_count || a.title.localeCompare(b.title, "ja"));
    return sorted;
  }, [rows, onlyTrade, series, sort]);

  const addItem = async (r: ItemRow) => {
    if (!user) return;
    setAddingId(r.id);
    try {
      const result = await addToCollection({
        userId: user.id,
        title: r.title,
        image: r.image ?? "",
        officialItemId: r.id,
        releaseDate: new Date().toISOString().split("T")[0],
        prize: "0",
      });
      if (!result.success) {
        toast.error(
          result.isAtLimit ? t("collectionScreen.addFlow.limitTitle") : t("collectionScreen.official.addFailed")
        );
        return;
      }
      if (result.userItemId) await copyTagsFromOfficialItem(r.id, result.userItemId);
      toast.success(t("collectionScreen.official.added"));
      // 「持ってる」表示・コンプ進捗・登録数などをまとめて引き直す
      await invalidateCollectionChanged(qc, { userId: user.id, officialItemId: r.id });
    } catch {
      toast.error(t("collectionScreen.official.addFailed"));
    } finally {
      setAddingId(null);
    }
  };

  if (!user) {
    return (
      <EmptyState
        icon={Search}
        message={t("engage.search.loginTitle")}
        description={t("engage.search.loginDesc")}
        action={<Button onClick={() => navigate("/login")}>{t("engage.search.login")}</Button>}
      />
    );
  }

  if (!q) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={Search}
          message={t("engage.search.emptyTitle")}
          description={t("engage.search.emptyDesc")}
        />
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground">{t("engage.search.popularSeries")}</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onPickSuggestion(s)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:border-primary/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <EmptyState icon={Search} message={t("engage.search.error")} />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Package}
        message={t("engage.search.noResult", { q })}
        description={t("engage.search.noResultDesc")}
        action={
          <Button onClick={() => navigate("/quick-add")} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t("engage.search.beFirst")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-muted p-1" role="tablist">
          {(["popular", "trade", "name"] as Sort[]).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={sort === s}
              onClick={() => setSort(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                sort === s ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              {t(`engage.search.sort.${s}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={onlyTrade}
          onClick={() => setOnlyTrade((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs",
            onlyTrade ? "border-primary bg-primary/10 text-primary" : "border-border"
          )}
        >
          <Repeat className="h-3 w-3" />
          {t("engage.search.onlyTrade")}
        </button>
        <span className="ml-auto text-xs text-muted-foreground">{t("engage.search.count", { n: shown.length })}</span>
      </div>

      {seriesChips.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {seriesChips.map(([name, n]) => (
            <button
              key={name}
              type="button"
              aria-pressed={series === name}
              onClick={() => setSeries((cur) => (cur === name ? null : name))}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                series === name ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
              )}
            >
              {name} <span className="tabular-nums opacity-70">{n}</span>
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <EmptyState icon={Package} message={t("engage.search.filteredEmpty")} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((r) => (
            <div key={r.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
              {/* 写真と名前を押すとグッズの詳細ページ（/item/:id）を開く。
                  以前はどこにも押し先がなく、「みんな」のグッズ一覧から詳細が見られなかった。
                  検索語は URL（?q=）に残っているので、戻ると同じ結果に戻れる。 */}
              <button
                type="button"
                onClick={() => navigate(`/item/${r.id}`)}
                aria-label={t("engage.search.openDetail", { title: r.title })}
                className="flex flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  {r.image && <img src={r.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain" />}
                  {r.trade_count > 0 && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-3xs font-bold text-primary-foreground shadow">
                      <Repeat className="h-3 w-3" />
                      {t("engage.search.tradeBadge", { n: r.trade_count })}
                    </span>
                  )}
                </div>
                <div className="min-h-[2.5rem] px-2.5 pt-2.5">
                  <p className="line-clamp-2 text-xs font-bold leading-tight">{r.title}</p>
                  {r.content_name && <p className="mt-0.5 truncate text-3xs text-muted-foreground">{r.content_name}</p>}
                </div>
              </button>
              <div className="flex flex-1 flex-col gap-2 p-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setOwnersFor(r)}
                  disabled={r.owner_count === 0}
                  className="inline-flex items-center gap-1 text-left text-2xs font-medium text-primary disabled:text-muted-foreground"
                >
                  <Users className="h-3.5 w-3.5" />
                  {r.owner_count > 0
                    ? t("engage.search.owners", { n: r.owner_count })
                    : t("engage.search.noOwners")}
                </button>
                {r.i_own ? (
                  <span className="inline-flex items-center justify-center gap-1 rounded-lg bg-muted py-1.5 text-2xs font-medium text-muted-foreground">
                    <Check className="h-3.5 w-3.5" />
                    {t("engage.search.iOwn")}
                  </span>
                ) : (
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" disabled={addingId === r.id} onClick={() => addItem(r)}>
                    <Plus className="h-3.5 w-3.5" />
                    {t("engage.search.add")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {ownersFor && (
        <ItemOwnersModal
          isOpen
          onClose={() => setOwnersFor(null)}
          itemTitle={ownersFor.title}
          itemImage={ownersFor.image ?? ""}
          officialItemId={ownersFor.id}
        />
      )}
    </div>
  );
}
