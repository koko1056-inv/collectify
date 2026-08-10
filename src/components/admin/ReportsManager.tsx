import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";

interface ReportRow {
  id: string;
  reason: string;
  detail: string | null;
  status: string;
  created_at: string;
  reported_user_id: string;
  reporter_id: string;
  trade_request_id: string | null;
  reported: { username: string | null } | null;
  reporter: { username: string | null } | null;
}

const NEXT_STATUS: Record<string, string[]> = {
  open: ["reviewing", "dismissed"],
  reviewing: ["resolved", "dismissed"],
  resolved: [],
  dismissed: ["reviewing"],
};

/**
 * 通報の確認。
 *
 * 通報を受け付ける口だけ作って読む場所が無いと、
 * 送った人にとっては何も起きていないのと同じになる。
 */
export function ReportsManager() {
  const { t } = useLanguage();
  const { formatDate } = useDateFormat();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-user-reports"],
    queryFn: async (): Promise<ReportRow[]> => {
      const { data, error } = await supabase
        .from("user_reports")
        .select(
          `id, reason, detail, status, created_at, reported_user_id, reporter_id, trade_request_id,
           reported:profiles!user_reports_reported_user_id_fkey(username),
           reporter:profiles!user_reports_reporter_id_fkey(username)`
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ReportRow[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("user_reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(t("admin.reports.updated"));
      await queryClient.invalidateQueries({ queryKey: ["admin-user-reports"] });
    },
    onError: (e) => {
      console.error("failed to update report:", e);
      toast.error(t("admin.reports.updateFailed"));
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flag className="h-5 w-5 text-primary" />
          {t("admin.reports.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("admin.reports.description")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
        ) : isError ? (
          <QueryErrorState title={t("admin.reports.loadFailed")} onRetry={() => refetch()} />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={Flag}
            title={t("admin.reports.noneTitle")}
            description={t("admin.reports.noneDesc")}
            className="py-8"
          />
        ) : (
          reports.map((r) => (
            <div key={r.id} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.status === "open" ? "default" : "secondary"} className="text-xs">
                  {t(`admin.reports.status.${r.status}`)}
                </Badge>
                <span className="text-sm font-medium">{t(`trade.report.reason.${r.reason}`)}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDate(r.created_at)}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                {t("admin.reports.parties", {
                  reporter: r.reporter?.username ?? "?",
                  reported: r.reported?.username ?? "?",
                })}
              </p>

              {r.detail && (
                <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-2 text-xs">{r.detail}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {(NEXT_STATUS[r.status] ?? []).map((next) => (
                  <Button
                    key={next}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate({ id: r.id, status: next })}
                  >
                    {setStatus.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    {t(`admin.reports.moveTo.${next}`)}
                  </Button>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
