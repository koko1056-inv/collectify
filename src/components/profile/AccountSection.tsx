import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Download, Loader2, Trash2, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AccountError, deleteMyAccount, downloadJson, fetchMyData } from "@/utils/accountData";

/** サーバーにも同じ文字列を渡す。画面の入力と一致したときだけ退会ボタンが押せる */
const CONFIRM_WORD = "DELETE";

interface AccountSectionProps {
  /** 退会後に設定シートなどを閉じるため */
  onDeleted?: () => void;
}

/** 設定の「アカウント」: データの書き出しと退会 */
export function AccountSection({ onDeleted }: AccountSectionProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [exporting, setExporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await fetchMyData();
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(data, `collectify-my-data-${date}.json`);
      toast.success(t("profileScreen.account.exportDone"));
    } catch {
      toast.error(t("profileScreen.common.error"), { description: t("profileScreen.account.exportFailed") });
    } finally {
      setExporting(false);
    }
  };

  const errorMessage = (e: unknown): string => {
    switch (e instanceof AccountError ? e.code : "unknown") {
      case "login_required":
        return t("profileScreen.account.errorLogin");
      case "admin_cannot_delete":
        return t("profileScreen.account.errorAdmin");
      case "subscription_cancel_failed":
      case "stripe_not_configured":
        return t("profileScreen.account.errorSubscription");
      default:
        return t("profileScreen.account.errorGeneric");
    }
  };

  const handleDelete = async () => {
    if (typed.trim() !== CONFIRM_WORD || deleting) return;
    setDeleting(true);
    try {
      const result = await deleteMyAccount();
      // アカウントはもう無いので、サーバーへの失効通知は不要。端末のセッションだけ消す
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      setDialogOpen(false);
      onDeleted?.();
      toast.success(t("profileScreen.account.doneTitle"), { description: t("profileScreen.account.doneDesc") });
      if (result.warnings.includes("store_subscription_active")) {
        toast.warning(t("profileScreen.account.storeSubTitle"), {
          description: t("profileScreen.account.storeSubDesc"),
          duration: 15000,
        });
      }
      navigate("/login", { replace: true });
    } catch (e) {
      toast.error(t("profileScreen.common.error"), { description: errorMessage(e) });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground px-1">{t("profileScreen.account.heading")}</h3>
      <div className="bg-card rounded-2xl border border-border divide-y divide-border">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left disabled:opacity-60"
        >
          <div className="text-muted-foreground">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">
              {exporting ? t("profileScreen.account.exporting") : t("profileScreen.account.export")}
            </div>
            <div className="text-xs text-muted-foreground">{t("profileScreen.account.exportDesc")}</div>
          </div>
        </button>
        <button
          onClick={() => {
            setTyped("");
            setDialogOpen(true);
          }}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/5 transition-colors text-left"
        >
          <div className="text-destructive">
            <UserX className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-destructive">{t("profileScreen.account.delete")}</div>
            <div className="text-xs text-muted-foreground">{t("profileScreen.account.deleteDesc")}</div>
          </div>
        </button>
      </div>

      <AlertDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          // 削除中は閉じさせない
          if (!deleting) setDialogOpen(o);
        }}
      >
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("profileScreen.account.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p>{t("profileScreen.account.deleteIntro")}</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{t("profileScreen.account.deleteItemProfile")}</li>
                  <li>{t("profileScreen.account.deleteItemCollection")}</li>
                  <li>{t("profileScreen.account.deleteItemMessages")}</li>
                  <li>{t("profileScreen.account.deleteItemImages")}</li>
                  <li className="font-medium text-destructive">{t("profileScreen.account.deleteItemPoints")}</li>
                </ul>
                <p>{t("profileScreen.account.deleteTradeWarn")}</p>
                <p>{t("profileScreen.account.deleteSubWarn")}</p>
                <p>{t("profileScreen.account.deleteBackupNote")}</p>
                <p>{t("profileScreen.account.exportHint")}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <label htmlFor="delete-account-confirm" className="text-sm font-medium">
              {t("profileScreen.account.typePrompt", { word: CONFIRM_WORD })}
            </label>
            <Input
              id="delete-account-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              disabled={deleting}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("profileScreen.common.cancel")}</AlertDialogCancel>
            {/* AlertDialogAction だと押した瞬間に閉じてしまうので、通常の Button にする */}
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={typed.trim() !== CONFIRM_WORD || deleting}
              className="gap-2"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? t("profileScreen.account.deleting") : t("profileScreen.account.deleteConfirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
