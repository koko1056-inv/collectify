import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, EyeOff, ExternalLink, Flag, Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface ReportRow {
  id: string;
  reason: string;
  detail: string | null;
  status: string;
  created_at: string;
  reported_user_id: string;
  reporter_id: string;
  trade_request_id: string | null;
  target_type: string;
  target_id: string | null;
  target_excerpt: string | null;
  target_meta: Record<string, unknown> | null;
  reported: { username: string | null } | null;
  reporter: { username: string | null } | null;
}

const NEXT_STATUS: Record<string, string[]> = {
  open: ["reviewing", "resolved", "dismissed"],
  reviewing: ["resolved", "dismissed"],
  resolved: [],
  dismissed: ["reviewing"],
};

/** 非表示にできる対象と、その is_hidden を持つテーブル */
const HIDEABLE_TABLES: Record<string, string> = {
  item_post: "item_posts",
  goods_post: "goods_posts",
  item_post_comment: "item_post_comments",
  post_comment: "post_comments",
  item_comment: "item_comments",
  room_message: "item_room_messages",
};

/** 24 時間以内に対応する運用。超えたら赤、半分を過ぎたら黄で目立たせる */
const SLA_HOURS = 24;

const isPending = (status: string) => status === "open" || status === "reviewing";

function hoursSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 3_600_000));
}

/** 対象を開くリンク。DM は非公開なので送信者のプロフィールへ */
function targetLink(r: ReportRow): string | null {
  const meta = r.target_meta ?? {};
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  switch (r.target_type) {
    case "user":
    case "profile":
      return `/user/${r.target_id ?? r.reported_user_id}`;
    case "item_post":
      return r.target_id ? `/post/${r.target_id}` : null;
    case "goods_post":
      return r.target_id ? `/posts?post=${r.target_id}` : null;
    case "item_post_comment": {
      const postId = str(meta.post_id);
      return postId ? `/post/${postId}` : null;
    }
    case "post_comment": {
      const postId = str(meta.post_id);
      return postId ? `/posts?post=${postId}` : null;
    }
    case "item_comment":
    case "room_message": {
      const itemId = str(meta.official_item_id);
      return itemId ? `/item/${itemId}` : null;
    }
    case "message":
      return `/user/${r.reported_user_id}`;
    default:
      return r.trade_request_id ? `/user/${r.reported_user_id}` : null;
  }
}

/**
 * 通報の確認。
 *
 * 通報を受け付ける口だけ作って読む場所が無いと、
 * 送った人にとっては何も起きていないのと同じになる。
 * Apple の審査基準 1.2 に合わせ、24 時間以内に対応する運用のため
 * 未対応を古い順に並べ、期限が近いものを目立たせる。
 */
export function ReportsManager() {
  const { t } = useLanguage();
  const { formatDate } = useDateFormat();
  const queryClient = useQueryClient();
  const now = Date.now();

  const { data: reports = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-user-reports"],
    queryFn: async (): Promise<ReportRow[]> => {
      const select = `id, reason, detail, status, created_at, reported_user_id, reporter_id, trade_request_id,
           target_type, target_id, target_excerpt, target_meta,
           reported:profiles!user_reports_reported_user_id_fkey(username),
           reporter:profiles!user_reports_reporter_id_fkey(username)`;
      // 未対応・確認中は古い順に全件、対応済みは新しい順に直近だけ
      const [pending, handled] = await Promise.all([
        supabase
          .from("user_reports")
          .select(select)
          .in("status", ["open", "reviewing"])
          .order("created_at", { ascending: true })
          .limit(300),
        supabase
          .from("user_reports")
          .select(select)
          .in("status", ["resolved", "dismissed"])
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (pending.error) throw pending.error;
      if (handled.error) throw handled.error;
      return [...(pending.data ?? []), ...(handled.data ?? [])] as unknown as ReportRow[];
    },
  });

  const pendingReports = useMemo(() => reports.filter((r) => isPending(r.status)), [reports]);
  const handledReports = useMemo(() => reports.filter((r) => !isPending(r.status)), [reports]);

  // 同じ対象への通報人数（自動非表示は 3 人で働く）
  const reporterCounts = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of pendingReports) {
      if (!r.target_id) continue;
      const key = `${r.target_type}:${r.target_id}`;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(r.reporter_id);
    }
    return map;
  }, [pendingReports]);

  // 対象コンテンツが今どちらの状態か（非表示中か）
  const hiddenKey = reports
    .filter((r) => r.target_id && HIDEABLE_TABLES[r.target_type])
    .map((r) => `${r.target_type}:${r.target_id}`)
    .sort()
    .join(",");

  const { data: hiddenMap = {} } = useQuery({
    queryKey: ["admin-report-hidden", hiddenKey],
    enabled: hiddenKey.length > 0,
    queryFn: async (): Promise<Record<string, { hidden: boolean; reason: string | null }>> => {
      const idsByType = new Map<string, string[]>();
      for (const r of reports) {
        if (!r.target_id || !HIDEABLE_TABLES[r.target_type]) continue;
        const list = idsByType.get(r.target_type) ?? [];
        if (!list.includes(r.target_id)) list.push(r.target_id);
        idsByType.set(r.target_type, list);
      }
      const out: Record<string, { hidden: boolean; reason: string | null }> = {};
      await Promise.all(
        [...idsByType.entries()].map(async ([type, ids]) => {
          // テーブル名が動的なため型を緩める（管理者は非表示のものも RLS で読める）
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data } = await (supabase as any)
            .from(HIDEABLE_TABLES[type])
            .select("id, is_hidden, hidden_reason")
            .in("id", ids);
          for (const row of (data ?? []) as { id: string; is_hidden: boolean; hidden_reason: string | null }[]) {
            out[`${type}:${row.id}`] = { hidden: row.is_hidden, reason: row.hidden_reason };
          }
        })
      );
      return out;
    },
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-user-reports"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-report-hidden"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-open-report-count"] }),
    ]);
  };

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("user_reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(t("admin.reports.updated"));
      await refresh();
    },
    onError: (e) => {
      console.error("failed to update report:", e);
      toast.error(t("admin.reports.updateFailed"));
    },
  });

  const setHidden = useMutation({
    mutationFn: async ({ type, id, hidden }: { type: string; id: string; hidden: boolean }) => {
      const { error } = await supabase.rpc("admin_set_content_hidden", {
        _target_type: type,
        _target_id: id,
        _hidden: hidden,
      });
      if (error) throw error;
      return hidden;
    },
    onSuccess: async (hidden) => {
      toast.success(t(hidden ? "admin.reports.hideDone" : "admin.reports.restoreDone"));
      await refresh();
    },
    onError: (e) => {
      console.error("failed to change visibility:", e);
      toast.error(t("admin.reports.hideFailed"));
    },
  });

  const renderReport = (r: ReportRow) => {
    const pending = isPending(r.status);
    const hours = hoursSince(r.created_at, now);
    const overdue = pending && hours >= SLA_HOURS;
    const soon = pending && !overdue && hours >= SLA_HOURS / 2;
    const link = targetLink(r);
    const key = r.target_id ? `${r.target_type}:${r.target_id}` : null;
    const hideable = !!r.target_id && !!HIDEABLE_TABLES[r.target_type];
    const hiddenInfo = key ? hiddenMap[key] : undefined;
    const reporterCount = key ? reporterCounts.get(key)?.size ?? 0 : 0;
    const busy = setStatus.isPending || setHidden.isPending;

    return (
      <div
        key={r.id}
        className={cn(
          "space-y-2 rounded-xl border p-3",
          overdue ? "border-destructive/60 bg-destructive/5" : soon ? "border-warning/50 bg-warning-soft" : "border-border"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={r.status === "open" ? "default" : "secondary"} className="text-xs">
            {t(`admin.reports.status.${r.status}`)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {t(`admin.reports.targetType.${r.target_type}`)}
          </Badge>
          <span className="text-sm font-medium">{t(`admin.reports.reason.${r.reason}`)}</span>
          <span className="ml-auto text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
        </div>

        {pending && (
          <p
            className={cn(
              "flex items-center gap-1 text-xs",
              overdue ? "font-semibold text-destructive" : soon ? "text-warning" : "text-muted-foreground"
            )}
          >
            {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
            {overdue
              ? t("admin.reports.overdue", { hours })
              : t("admin.reports.elapsed", { hours })}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {t("admin.reports.parties", {
            reporter: r.reporter?.username ?? "?",
            reported: r.reported?.username ?? "?",
          })}
          {reporterCount > 1 && (
            <span className="ml-2 font-medium text-foreground">
              {t("admin.reports.reporterCount", { count: reporterCount })}
            </span>
          )}
        </p>

        {r.target_excerpt && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-2">
            <p className="mb-0.5 text-3xs font-medium text-muted-foreground">{t("admin.reports.excerpt")}</p>
            <p className="whitespace-pre-wrap break-words text-xs">{r.target_excerpt}</p>
          </div>
        )}

        {r.detail && (
          <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-2 text-xs">{r.detail}</p>
        )}

        {hiddenInfo?.hidden && (
          <p className="flex items-center gap-1 text-xs font-medium text-warning">
            <EyeOff className="h-3.5 w-3.5" />
            {hiddenInfo.reason === "auto_reports" ? t("admin.reports.autoHidden") : t("admin.reports.hiddenNow")}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {link && (
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link to={link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" />
                {t("admin.reports.openTarget")}
              </Link>
            </Button>
          )}

          {hideable && hiddenInfo && (
            <Button
              size="sm"
              variant={hiddenInfo.hidden ? "outline" : "destructive"}
              className="h-7 text-xs"
              disabled={busy}
              onClick={() =>
                setHidden.mutate({ type: r.target_type, id: r.target_id!, hidden: !hiddenInfo.hidden })
              }
            >
              {setHidden.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {hiddenInfo.hidden ? t("admin.reports.restore") : t("admin.reports.hide")}
            </Button>
          )}

          {(NEXT_STATUS[r.status] ?? []).map((next) => (
            <Button
              key={next}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={busy}
              onClick={() => setStatus.mutate({ id: r.id, status: next })}
            >
              {setStatus.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {t(`admin.reports.moveTo.${next}`)}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flag className="h-5 w-5 text-primary" />
          {t("admin.reports.title")}
          {pendingReports.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {pendingReports.length}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("admin.reports.description")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <>
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">
                  {t("admin.reports.pendingTitle")}（{pendingReports.length}）
                </h3>
                <p className="text-xs text-muted-foreground">{t("admin.reports.pendingHint")}</p>
              </div>
              {pendingReports.length === 0 ? (
                <p className="rounded-xl bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                  {t("admin.reports.allClear")}
                </p>
              ) : (
                pendingReports.map(renderReport)
              )}
            </section>

            {handledReports.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">{t("admin.reports.handledTitle")}</h3>
                {handledReports.map(renderReport)}
              </section>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
