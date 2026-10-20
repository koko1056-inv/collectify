import { useQuery } from "@tanstack/react-query";
import { Megaphone, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import type { CatalogRequestRankingRow } from "@/hooks/useCatalogRequests";

/**
 * 「この推しを追加してほしい」リクエストの集計（件数の多い順）。
 * catalog_request_ranking RPC が正規化した語ごとにまとめて返す（管理者のみ実行可）。
 */
export function CatalogRequestsManager() {
  const { t } = useLanguage();
  const { formatDate } = useDateFormat();

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-catalog-requests"],
    queryFn: async (): Promise<CatalogRequestRankingRow[]> => {
      const { data, error } = await supabase.rpc("catalog_request_ranking", { _limit: 100 });
      if (error) throw error;
      return (data ?? []) as CatalogRequestRankingRow[];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Megaphone className="h-5 w-5 text-primary" />
          {t("admin.catalogRequests.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("admin.catalogRequests.description")}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
        ) : isError ? (
          <QueryErrorState title={t("admin.catalogRequests.loadFailed")} onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Megaphone} title={t("admin.catalogRequests.noneTitle")} description={t("admin.catalogRequests.noneDesc")} className="py-8" />
        ) : (
          rows.map((r) => (
            <div key={r.query_norm} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.sample_query}</p>
                <p className="text-xs text-muted-foreground">
                  {t("admin.catalogRequests.lastRequested", { date: formatDate(r.last_requested_at) })}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-xs">
                {t("admin.catalogRequests.count", { n: r.request_count })}
              </Badge>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" aria-hidden="true" />
                {r.unique_user_count}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
