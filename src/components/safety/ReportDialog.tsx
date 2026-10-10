import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBlockUser } from "@/hooks/useBlocks";

/** 通報の対象。user_reports.target_type と同じ値。 */
export type ReportTargetType =
  | "user"
  | "profile"
  | "item_post"
  | "goods_post"
  | "item_post_comment"
  | "post_comment"
  | "item_comment"
  | "message"
  | "room_message";

const REPORT_REASONS = [
  "inappropriate",
  "harassment",
  "spam",
  "copyright",
  "impersonation",
  "privacy",
  "other",
] as const;

type Reason = (typeof REPORT_REASONS)[number];

export interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  /** 対象の id（user / profile の場合はユーザーの id） */
  targetId: string;
  /** 対象の持ち主。渡すと「この人もブロックする」を出す */
  ownerId?: string | null;
  ownerName?: string | null;
}

/**
 * 通報ダイアログ（ユーザー・投稿・コメント・メッセージ共通）。
 *
 * 送信は submit_report() を通す。対象の存在確認・持ち主の特定・本文の控えはサーバー側でやる。
 * 通報したことは相手に伝わらない。
 */
export function ReportDialog({
  isOpen,
  onClose,
  targetType,
  targetId,
  ownerId,
  ownerName,
}: ReportDialogProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const blockUser = useBlockUser();

  const [reason, setReason] = useState<Reason>("inappropriate");
  const [detail, setDetail] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const canBlock = !!ownerId && ownerId !== user?.id;

  const reset = () => {
    setReason("inappropriate");
    setDetail("");
    setAlsoBlock(false);
    setSent(false);
  };

  const close = () => {
    onClose();
    // 閉じるアニメーションの間に中身が切り替わって見えないよう、少し待ってから戻す
    setTimeout(reset, 200);
  };

  const submit = async () => {
    if (!user) return;
    setIsSending(true);
    try {
      const { error } = await supabase.rpc("submit_report", {
        _target_type: targetType,
        _target_id: targetId,
        _reason: reason,
        _detail: detail.trim() || undefined,
      });

      if (error) {
        const msg = error.message || "";
        if (msg.includes("ALREADY_REPORTED")) {
          toast.info(t("safety.report.alreadyReported"));
          close();
          return;
        }
        if (msg.includes("REPORT_RATE_LIMITED")) {
          toast.error(t("safety.report.failedTitle"), { description: t("safety.report.rateLimited") });
          return;
        }
        if (msg.includes("SELF_REPORT")) {
          toast.error(t("safety.report.selfReport"));
          return;
        }
        if (msg.includes("TARGET_NOT_FOUND")) {
          toast.error(t("safety.report.failedTitle"), { description: t("safety.report.notFound") });
          return;
        }
        throw error;
      }

      if (alsoBlock && canBlock && ownerId) {
        try {
          await blockUser.mutateAsync({ userId: ownerId, name: ownerName ?? undefined });
        } catch {
          // ブロックの失敗は useBlockUser がトーストで知らせる。通報自体は受け付け済み
        }
      }

      setSent(true);
    } catch (e) {
      console.error("Failed to submit report:", e);
      toast.error(t("safety.report.failedTitle"), { description: t("safety.report.failedDesc") });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {t("safety.report.sentTitle")}
              </DialogTitle>
              <DialogDescription>{t("safety.report.sentBody")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={close}>{t("safety.report.close")}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("safety.report.title")}</DialogTitle>
              <DialogDescription>
                {t("safety.report.description", { target: t(`safety.report.target.${targetType}`) })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <RadioGroup value={reason} onValueChange={(v) => setReason(v as Reason)}>
                {REPORT_REASONS.map((r) => (
                  <div key={r} className="flex items-center gap-2">
                    <RadioGroupItem value={r} id={`report-reason-${r}`} />
                    <Label htmlFor={`report-reason-${r}`} className="text-sm font-normal">
                      {t(`safety.report.reason.${r}`)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <div className="space-y-1.5">
                <Label htmlFor="report-detail-text" className="text-sm">
                  {t("safety.report.detailLabel")}
                </Label>
                <Textarea
                  id="report-detail-text"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder={t("safety.report.detailPlaceholder")}
                  className="min-h-[80px]"
                  maxLength={1000}
                />
              </div>

              {canBlock && (
                <label className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
                  <Checkbox
                    checked={alsoBlock}
                    onCheckedChange={(v) => setAlsoBlock(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-xs">
                    <span className="block font-medium">{t("safety.report.blockToo")}</span>
                    <span className="block text-muted-foreground">{t("safety.report.blockTooHint")}</span>
                  </span>
                </label>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={close} disabled={isSending}>
                {t("safety.report.cancel")}
              </Button>
              <Button onClick={submit} disabled={isSending}>
                {isSending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {t("safety.report.submit")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
