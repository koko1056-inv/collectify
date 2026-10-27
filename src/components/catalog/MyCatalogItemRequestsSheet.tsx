import { Link } from "react-router-dom";
import { ClipboardList, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { PockeSays } from "@/components/pocke/Pocke";
import { pockeCheer } from "@/components/pocke/pockeCheer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import {
  useMyCatalogItemRequests,
  useTagNames,
  useWithdrawCatalogItemRequest,
  type CatalogItemRequestRow,
} from "@/hooks/useCatalogItemRequests";
import { PROPOSED_FIELDS, requestErrorKey, type CatalogItemRequestStatus } from "@/utils/catalogItemRequests";
import { fallbackToOriginal, getOptimizedImageUrl } from "@/utils/optimized-image";
import { cn } from "@/lib/utils";

interface MyCatalogItemRequestsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_TONE: Record<CatalogItemRequestStatus, string> = {
  pending: "bg-warning-soft text-warning border-warning/30",
  approved: "bg-primary/10 text-primary border-primary/30",
  rejected: "bg-muted text-muted-foreground border-border",
  withdrawn: "bg-muted text-muted-foreground border-border",
};

/**
 * 自分が送ったカタログへの申請（削除・修正・重複の報告）と、運営の確認の状況。
 * 本人と運営だけが見られる（ほかのユーザーには出さない）。確認待ちのものは取り下げられる。
 */
export function MyCatalogItemRequestsSheet({ open, onOpenChange }: MyCatalogItemRequestsSheetProps) {
  const { t } = useLanguage();
  const { data: rows = [], isLoading, isError, refetch } = useMyCatalogItemRequests(open);

  // 修正申請のキャラ・カテゴリを名前で出す
  const tagIds = [
    ...new Set(
      rows.flatMap((r) => [...(r.proposed?.character_tag_ids ?? []), ...(r.proposed?.type_tag_id ? [r.proposed.type_tag_id] : [])])
    ),
  ];
  const { data: tagNames = {} } = useTagNames(open ? tagIds : []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
        data-testid="my-catalog-item-requests"
      >
        <SheetHeader className="border-b px-5 pb-3 pt-5 text-left">
          <SheetTitle>{t("catalogItemRequest.status.title")}</SheetTitle>
          <SheetDescription className="text-xs">{t("catalogItemRequest.status.desc")}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-8 pt-4">
          {isLoading ? (
            <PockeSays pose="think" height={72} className="py-6">
              <p className="flex items-center gap-1.5 text-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                {t("catalogItemRequest.status.loading")}
              </p>
            </PockeSays>
          ) : isError ? (
            <QueryErrorState onRetry={() => refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState icon={ClipboardList} title={t("catalogItemRequest.status.empty")} className="py-10" />
          ) : (
            rows.map((r) => <RequestRow key={r.id} row={r} tagNames={tagNames} onNavigate={() => onOpenChange(false)} />)
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RequestRow({
  row,
  tagNames,
  onNavigate,
}: {
  row: CatalogItemRequestRow;
  tagNames: Record<string, string>;
  onNavigate: () => void;
}) {
  const { t } = useLanguage();
  const { formatDate } = useDateFormat();
  const withdraw = useWithdrawCatalogItemRequest();

  const handleWithdraw = async () => {
    if (!window.confirm(t("catalogItemRequest.status.withdrawConfirm"))) return;
    try {
      await withdraw.mutateAsync(row.id);
      pockeCheer("catalogRequestWithdrawn");
    } catch (e) {
      console.error("withdraw failed:", e);
      toast.error(t(`catalogItemRequest.sheet.failed.${requestErrorKey(e)}`));
    }
  };

  const proposedText = (field: (typeof PROPOSED_FIELDS)[number]) => {
    const p = row.proposed ?? {};
    if (field === "character_tag_ids") return (p.character_tag_ids ?? []).map((id) => tagNames[id] ?? "…").join("、") || "—";
    if (field === "type_tag_id") return p.type_tag_id ? tagNames[p.type_tag_id] ?? "…" : "";
    if (field === "image") return "";
    return String(p[field] ?? "");
  };

  return (
    <article className="space-y-2 rounded-2xl border border-border bg-card p-3" data-testid="my-request-row">
      <div className="flex items-start gap-3">
        <Link
          to={`/item/${row.official_item_id}`}
          onClick={onNavigate}
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted/40"
          aria-label={t("catalogItemRequest.status.openItem")}
        >
          {row.item?.image && (
            <img
              src={getOptimizedImageUrl(row.item.image, { width: 160 })}
              onError={fallbackToOriginal(row.item.image)}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
        </Link>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("text-3xs", STATUS_TONE[row.status])}>
              {t(`catalogItemRequest.status.${row.status}`)}
            </Badge>
            <span className="text-2xs font-medium text-muted-foreground">{t(`catalogItemRequest.kind.${row.kind}`)}</span>
          </div>
          <p className="line-clamp-2 text-sm font-medium leading-snug">{row.item?.title ?? "—"}</p>
          <p className="text-3xs text-muted-foreground">
            {t("catalogItemRequest.status.sentAt", { date: formatDate(row.created_at) })}
          </p>
        </div>
      </div>

      {row.kind === "delete" && row.reason && (
        <p className="text-xs text-foreground/80">{t(`catalogItemRequest.reason.${row.reason}`)}</p>
      )}
      {row.kind === "duplicate" && row.duplicate && (
        <p className="text-xs text-foreground/80">
          {t("catalogItemRequest.status.sameAs", { title: row.duplicate.title })}
        </p>
      )}
      {row.kind === "edit" && row.proposed && (
        <ul className="space-y-0.5 text-xs">
          {PROPOSED_FIELDS.filter((f) => row.proposed && f in row.proposed).map((f) => (
            <li key={f} className="flex gap-1.5">
              <span className="shrink-0 text-muted-foreground">{t(`catalogItemRequest.field.${f}`)}</span>
              <span className="min-w-0 truncate">
                {f === "image" && row.proposed?.image ? (
                  <img src={row.proposed.image} alt="" className="inline-block h-8 w-8 rounded object-contain align-middle" />
                ) : (
                  proposedText(f)
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {row.note && <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-2 text-xs">{row.note}</p>}
      {row.admin_note && (
        <p className="whitespace-pre-wrap rounded-lg bg-primary/5 p-2 text-xs text-primary">
          {t("catalogItemRequest.status.adminNote", { note: row.admin_note })}
        </p>
      )}
      {row.status === "pending" && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            onClick={handleWithdraw}
            disabled={withdraw.isPending}
          >
            {withdraw.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
            {t("catalogItemRequest.status.withdraw")}
          </Button>
        </div>
      )}
    </article>
  );
}
