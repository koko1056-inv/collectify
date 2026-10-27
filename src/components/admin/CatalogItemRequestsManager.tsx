import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ClipboardList, ExternalLink, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import {
  useAdminCatalogItemRequests,
  useReviewCatalogItemRequest,
  useTagNames,
  type AdminCatalogItemRequestRow,
} from "@/hooks/useCatalogItemRequests";
import {
  buildRequestDiff,
  collectTagIds,
  currentValuesFromItem,
  requestErrorKey,
  type DiffRow,
} from "@/utils/catalogItemRequests";
import { fallbackToOriginal, getOptimizedImageUrl } from "@/utils/optimized-image";
import { cn } from "@/lib/utils";

/**
 * カタログへの申請（削除申請・修正申請・重複の報告）の確認。通報（ReportsManager）と同じ並べ方:
 * 確認待ちを古い順に全件、確認済みは新しい順に直近だけ。
 * 承認するとそのままカタログに反映する（review_catalog_item_request）。反映前の値は申請の行に残る。
 */
export function CatalogItemRequestsManager() {
  const { t } = useLanguage();
  const { data: rows = [], isLoading, isError, refetch } = useAdminCatalogItemRequests();

  const pending = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);
  const handled = useMemo(() => rows.filter((r) => r.status !== "pending"), [rows]);

  // 差分に出てくるタグの名前（申請された側のキャラ・カテゴリは、いまのグッズには付いていないことがある）
  const tagIds = useMemo(
    () =>
      [
        ...new Set(
          rows.flatMap((r) => (r.kind === "edit" && r.item ? collectTagIds(currentValuesFromItem(r.item), r.proposed) : []))
        ),
      ],
    [rows]
  );
  const { data: tagNames = {} } = useTagNames(tagIds);

  return (
    <Card data-testid="admin-catalog-item-requests">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5 text-primary" />
          {t("catalogItemRequest.admin.title")}
          {pending.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {pending.length}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("catalogItemRequest.admin.description")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : isError ? (
          <QueryErrorState title={t("catalogItemRequest.admin.loadFailed")} onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t("catalogItemRequest.admin.noneTitle")}
            description={t("catalogItemRequest.admin.noneDesc")}
            className="py-8"
          />
        ) : (
          <>
            <section className="space-y-3">
              <h3 className="text-sm font-bold">
                {t("catalogItemRequest.admin.pendingTitle")}（{pending.length}）
              </h3>
              {pending.length === 0 ? (
                <p className="rounded-xl bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                  {t("catalogItemRequest.admin.allClear")}
                </p>
              ) : (
                pending.map((r) => <RequestCard key={r.id} row={r} tagNames={tagNames} />)
              )}
            </section>
            {handled.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground">{t("catalogItemRequest.admin.handledTitle")}</h3>
                {handled.map((r) => (
                  <RequestCard key={r.id} row={r} tagNames={tagNames} />
                ))}
              </section>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Thumb({ image, className }: { image: string | null | undefined; className?: string }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-lg bg-muted/40", className)}>
      {image && (
        <img
          src={getOptimizedImageUrl(image, { width: 200 })}
          onError={fallbackToOriginal(image)}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
    </div>
  );
}

function RequestCard({ row, tagNames }: { row: AdminCatalogItemRequestRow; tagNames: Record<string, string> }) {
  const { t } = useLanguage();
  const { formatDate } = useDateFormat();
  const review = useReviewCatalogItemRequest();
  const [adminNote, setAdminNote] = useState("");
  const [keepReported, setKeepReported] = useState(false);
  const isPending = row.status === "pending";

  const diff: DiffRow[] = useMemo(
    () => (row.kind === "edit" && row.item ? buildRequestDiff(currentValuesFromItem(row.item), row.proposed, tagNames) : []),
    [row, tagNames]
  );

  const handle = async (approve: boolean) => {
    try {
      await review.mutateAsync({ requestId: row.id, approve, adminNote, keepReported });
    } catch (e) {
      console.error("review failed:", e);
      const key = requestErrorKey(e);
      toast.error(
        key === "failed" ? t("catalogItemRequest.admin.reviewFailed") : t(`catalogItemRequest.sheet.failed.${key}`)
      );
    }
  };

  const statusLabel =
    row.status === "approved"
      ? t("catalogItemRequest.admin.approvedLabel")
      : row.status === "rejected"
        ? t("catalogItemRequest.admin.rejectedLabel")
        : row.status === "withdrawn"
          ? t("catalogItemRequest.admin.withdrawnLabel")
          : t("catalogItemRequest.status.pending");

  return (
    <div
      className={cn("space-y-3 rounded-xl border p-3", isPending ? "border-border bg-card" : "border-border/60 bg-muted/20")}
      data-testid="admin-request-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isPending ? "default" : "secondary"} className="text-xs">
          {statusLabel}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {t(`catalogItemRequest.kind.${row.kind}`)}
        </Badge>
        {row.kind === "delete" && row.reason && (
          <span className="text-sm font-medium">{t(`catalogItemRequest.reason.${row.reason}`)}</span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{formatDate(row.created_at)}</span>
      </div>

      <div className="flex items-start gap-3">
        <Thumb image={row.item?.image} className="h-16 w-16" />
        <div className="min-w-0 flex-1 space-y-0.5">
          {row.item?.content_name && <p className="truncate text-2xs font-medium text-primary">{row.item.content_name}</p>}
          <p className="line-clamp-2 text-sm font-medium leading-snug">{row.item?.title ?? "—"}</p>
          <p className="text-2xs text-muted-foreground">
            {t("catalogItemRequest.admin.requester", {
              name: row.requester?.username || t("catalogItemRequest.admin.someone"),
            })}
          </p>
        </div>
        <Button asChild size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs">
          <Link to={`/item/${row.official_item_id}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1 h-3 w-3" />
            {t("catalogItemRequest.admin.openItem")}
          </Link>
        </Button>
      </div>

      {row.kind === "edit" && diff.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full table-fixed text-xs">
            <thead className="bg-muted/50 text-3xs text-muted-foreground">
              <tr>
                <th className="w-[22%] px-2 py-1 text-left font-medium" />
                <th className="px-2 py-1 text-left font-medium">{t("catalogItemRequest.admin.before")}</th>
                <th className="px-2 py-1 text-left font-medium">{t("catalogItemRequest.admin.after")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {diff.map((d) => {
                const same = d.before === d.after;
                return (
                  <tr key={d.field} className="align-top">
                    <td className="px-2 py-1.5 text-muted-foreground">{t(`catalogItemRequest.field.${d.field}`)}</td>
                    {d.field === "image" ? (
                      <>
                        <td className="px-2 py-1.5">
                          <Thumb image={d.before} className="h-14 w-14" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Thumb image={d.after} className="h-14 w-14 ring-2 ring-primary/40" />
                        </td>
                      </>
                    ) : (
                      <>
                        <td
                          className={cn(
                            "break-words px-2 py-1.5 text-muted-foreground",
                            !same && "line-through decoration-muted-foreground/40"
                          )}
                        >
                          {d.before || "—"}
                        </td>
                        <td className={cn("break-words px-2 py-1.5", same ? "text-muted-foreground" : "font-bold text-primary")}>
                          {d.after || "—"}
                          {same && <span className="ml-1 text-3xs">{t("catalogItemRequest.admin.same")}</span>}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {row.kind === "duplicate" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-2">
            <Thumb image={row.item?.image} className="h-12 w-12" />
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Thumb image={row.duplicate?.image} className="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-xs">{row.duplicate?.title ?? "—"}</p>
              {row.duplicate_of && (
                <Link
                  to={`/item/${row.duplicate_of}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-3xs text-primary underline underline-offset-2"
                >
                  {t("catalogItemRequest.admin.openItem")}
                </Link>
              )}
            </div>
          </div>
          {isPending && (
            <>
              <p className="text-2xs text-muted-foreground">{t("catalogItemRequest.admin.duplicateEffect")}</p>
              <div role="radiogroup" className="grid gap-1.5">
                {[false, true].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    role="radio"
                    aria-checked={keepReported === v}
                    onClick={() => setKeepReported(v)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-left text-xs",
                      keepReported === v ? "border-primary bg-primary/10 font-bold text-primary" : "border-border"
                    )}
                  >
                    {v ? t("catalogItemRequest.admin.keepReported") : t("catalogItemRequest.admin.keepOther")}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {row.kind === "delete" && isPending && (
        <p className="text-2xs text-muted-foreground">
          {row.item?.exclude_from_lists ? t("catalogItemRequest.admin.alreadyExcluded") : t("catalogItemRequest.admin.deleteEffect")}
        </p>
      )}

      {row.item?.merged_into && <p className="text-2xs font-medium text-warning">{t("catalogItemRequest.admin.merged")}</p>}

      {row.note && (
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="mb-0.5 text-3xs font-medium text-muted-foreground">{t("catalogItemRequest.admin.noteLabel")}</p>
          <p className="whitespace-pre-wrap break-words text-xs">{row.note}</p>
        </div>
      )}

      {!isPending && row.admin_note && (
        <p className="whitespace-pre-wrap rounded-lg bg-primary/5 p-2 text-xs text-primary">{row.admin_note}</p>
      )}

      {isPending && (
        <div className="space-y-2">
          <Textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={t("catalogItemRequest.admin.adminNotePlaceholder")}
            className="text-xs"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" disabled={review.isPending} onClick={() => handle(false)}>
              <X className="h-3.5 w-3.5" />
              {t("catalogItemRequest.admin.reject")}
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1 text-xs"
              disabled={review.isPending || !!row.item?.merged_into}
              onClick={() => handle(true)}
            >
              {review.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {t("catalogItemRequest.admin.approve")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
