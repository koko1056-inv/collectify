import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Inbox, Loader2, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import type { FeedbackKind, FeedbackRequest, FeedbackStatus } from "@/hooks/useFeedback";

interface Row extends FeedbackRequest {
  profile: { username: string | null } | null;
}

const STATUSES: FeedbackStatus[] = ["open", "reviewing", "planned", "done", "declined"];
const KINDS: Array<FeedbackKind | "all"> = ["all", "content", "feature", "bug", "other"];

/**
 * ユーザーからの要望・追加してほしいコンテンツの確認。
 * 状況を変えると送った人へ通知が飛ぶ（追加してほしいコンテンツを「対応済み」にすると +10pt）。
 * 「公開」にしたものだけが、みんなの要望ボードに出て、票を集められる。
 */
export function FeedbackManager() {
  const { t } = useLanguage();
  const { formatDate } = useDateFormat();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<FeedbackKind | "all">("all");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("open");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-feedback", kind, statusFilter],
    queryFn: async (): Promise<Row[]> => {
      let q = supabase
        .from("feedback_requests")
        .select("id, user_id, kind, title, body, url, status, admin_note, is_public, vote_count, created_at, profile:profiles!feedback_requests_user_profile_fkey(username)")
        .order("vote_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      if (kind !== "all") q = q.eq("kind", kind);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<FeedbackRequest, "status" | "admin_note" | "is_public">> }) => {
      const { error } = await supabase.from("feedback_requests").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(t("admin.feedback.updated"));
      await queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
    },
    onError: (e) => {
      console.error("failed to update feedback:", e);
      toast.error(t("admin.feedback.updateFailed"));
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Inbox className="h-5 w-5 text-primary" />
          {t("admin.feedback.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("admin.feedback.description")}</p>
        <div className="flex flex-wrap gap-1.5 pt-2" role="group" aria-label={t("admin.feedback.filterKind")}>
          {KINDS.map((k) => (
            <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} className="h-7 text-xs" onClick={() => setKind(k)}>
              {k === "all" ? t("admin.feedback.all") : t(`engage.feedback.kind.${k}`)}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("admin.feedback.filterStatus")}>
          {(["all", ...STATUSES] as const).map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="h-7 text-xs" onClick={() => setStatusFilter(s)}>
              {s === "all" ? t("admin.feedback.all") : t(`engage.feedback.status.${s}`)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : isError ? (
          <QueryErrorState title={t("admin.feedback.loadFailed")} onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Inbox} title={t("admin.feedback.noneTitle")} description={t("admin.feedback.noneDesc")} className="py-8" />
        ) : (
          rows.map((r) => (
            <div key={r.id} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.status === "open" ? "default" : "secondary"} className="text-xs">
                  {t(`engage.feedback.status.${r.status}`)}
                </Badge>
                <span className="text-xs text-muted-foreground">{t(`engage.feedback.kind.${r.kind}`)}</span>
                {r.vote_count > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-primary">
                    <ThumbsUp className="h-3 w-3" aria-hidden="true" />
                    {r.vote_count}
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {r.profile?.username ?? "?"} ・ {formatDate(r.created_at)}
                </span>
              </div>
              <p className="text-sm font-medium">{r.title}</p>
              {r.body && <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-2 text-xs">{r.body}</p>}
              {r.url && (
                <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="block truncate text-xs text-primary underline">
                  {r.url}
                </a>
              )}

              <div className="flex flex-wrap gap-1.5">
                {STATUSES.filter((s) => s !== r.status).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: r.id, patch: { status: s, admin_note: (notes[r.id] ?? r.admin_note ?? "").trim() || null } })}
                  >
                    {update.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    {t("admin.feedback.moveTo", { status: t(`engage.feedback.status.${s}`) })}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant={r.is_public ? "default" : "outline"}
                  className="h-7 text-xs"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ id: r.id, patch: { is_public: !r.is_public } })}
                >
                  {r.is_public ? <Eye className="mr-1 h-3 w-3" /> : <EyeOff className="mr-1 h-3 w-3" />}
                  {r.is_public ? t("admin.feedback.public") : t("admin.feedback.makePublic")}
                </Button>
              </div>

              <Input
                value={notes[r.id] ?? r.admin_note ?? ""}
                maxLength={500}
                onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                onBlur={() => {
                  const next = (notes[r.id] ?? "").trim();
                  if (notes[r.id] !== undefined && next !== (r.admin_note ?? "")) update.mutate({ id: r.id, patch: { admin_note: next || null } });
                }}
                placeholder={t("admin.feedback.notePlaceholder")}
                className="h-8 text-xs"
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
