import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, PackageOpen, Trash2 } from "lucide-react";
import { deleteUserItem, type ReleaseReason } from "@/utils/tag/user-item-operations";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { invalidateCollectionChanged } from "@/utils/collection-cache";
import { pastItemsKey } from "@/hooks/usePastItems";
import { cn } from "@/lib/utils";

interface ItemDetailsDeleteDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  itemId: string;
  isUserItem: boolean;
  onCloseModal: () => void;
  userId?: string;
  user?: { id?: string } | null;
}

const REASONS: ReleaseReason[] = ["sold", "gift", "other"];

/**
 * コレクションから外すときの確認。
 * 「手放した」（売った・あげた など）なら記録を残し、「登録ミス」ならそのまま消す。
 * 以前は消すしかなく、手放したグッズの歴史が残らなかった。
 */
export function ItemDetailsDeleteDialog({
  open,
  setOpen,
  title,
  itemId,
  isUserItem,
  onCloseModal,
  userId,
  user,
}: ItemDetailsDeleteDialogProps) {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { user: authUser } = useAuth();
  const [mode, setMode] = useState<"release" | "mistake">("release");
  const [reason, setReason] = useState<ReleaseReason>("other");
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (!isUserItem || !itemId) return;
    setBusy(true);
    try {
      const { error, officialItemId } = await deleteUserItem(itemId, mode === "release" ? { release: reason } : {});
      if (error) throw error;

      const uid = authUser?.id ?? user?.id ?? userId;
      // コレクションから計算している数字（コンプ進捗・登録数など）をまとめて引き直す。
      // 以前は ["user-items"] などしか引き直しておらず、削除してもコンプ進捗・登録数が古いまま残った
      void invalidateCollectionChanged(queryClient, { userId: uid, officialItemId });
      if (mode === "release") {
        void queryClient.invalidateQueries({ queryKey: pastItemsKey(uid) });
        toast.success(t("records.release.releasedToast"));
      } else {
        toast.success(t("itemDetails.remove.success"), {
          description: t("itemDetails.remove.successDescription"),
        });
      }
      onCloseModal();
    } catch (error) {
      // 交換が成立して進行中の品は、サーバーが削除を止める
      const inTrade = JSON.stringify(error ?? "").includes("trade_in_progress");
      toast.error(t("itemDetails.common.error"), {
        description: inTrade ? t("trade.errors.itemInTrade") : t("itemDetails.remove.failed"),
      });
    } finally {
      setBusy(false);
    }
  };

  const option = (value: "release" | "mistake", Icon: typeof Trash2, label: string, desc: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === value}
      onClick={() => setMode(value)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        mode === value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", mode === value ? "text-primary" : "text-muted-foreground")} />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-2xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]" data-testid="release-dialog">
        <DialogHeader>
          <DialogTitle>{t("records.release.title")}</DialogTitle>
          <DialogDescription className="break-words">{t("records.release.desc", { title })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2" role="radiogroup" aria-label={t("records.release.title")}>
          {option("release", PackageOpen, t("records.release.released"), t("records.release.releasedDesc"))}
          {mode === "release" && (
            <div className="flex flex-wrap gap-1.5 pl-10">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  aria-pressed={reason === r}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    reason === r ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {t(`records.release.reasons.${r}`)}
                </button>
              ))}
            </div>
          )}
          {option("mistake", Trash2, t("records.release.mistake"), t("records.release.mistakeDesc"))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            {t("itemDetails.common.cancel")}
          </Button>
          <Button
            variant={mode === "release" ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={busy}
            data-testid="release-confirm"
          >
            {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {mode === "release" ? t("records.release.confirmRelease") : t("records.release.confirmDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
