import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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

const REASONS = [
  "no_shipment",
  "different_item",
  "damaged",
  "harassment",
  "spam",
  "other",
] as const;

type Reason = (typeof REASONS)[number];

interface ReportUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserName: string;
  tradeRequestId?: string;
}

/**
 * 通報。ついでにブロックもできるようにしてある。
 *
 * 通報したことは相手に伝わらない。伝わると報復の呼び水になるし、
 * 「通報したら気まずくなる」と思われた時点で誰も使わなくなる。
 */
export function ReportUserDialog({
  isOpen,
  onClose,
  reportedUserId,
  reportedUserName,
  tradeRequestId,
}: ReportUserDialogProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [reason, setReason] = useState<Reason>("no_shipment");
  const [detail, setDetail] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const submit = async () => {
    if (!user) return;
    setIsSending(true);
    try {
      const { error } = await supabase.from("user_reports").insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        trade_request_id: tradeRequestId ?? null,
        reason,
        detail: detail.trim() || null,
      });

      // 同じ取引について2回目を送ろうとした場合は、失敗ではなく受付済みとして扱う
      if (error && error.code !== "23505") throw error;

      if (alsoBlock) {
        await supabase
          .from("user_blocks")
          .insert({ blocker_id: user.id, blocked_id: reportedUserId });
        await queryClient.invalidateQueries({ queryKey: ["trade-matches", user.id] });
      }

      toast.success(t("trade.report.sentTitle"), {
        description: t("trade.report.sentDesc"),
      });
      onClose();
      setDetail("");
    } catch (e) {
      console.error("Failed to submit report:", e);
      toast.error(t("trade.report.failedTitle"), {
        description: t("trade.report.failedDesc"),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("trade.report.title")}</DialogTitle>
          <DialogDescription>
            {t("trade.report.description", { name: reportedUserName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RadioGroup value={reason} onValueChange={(v) => setReason(v as Reason)}>
            {REASONS.map((r) => (
              <div key={r} className="flex items-center gap-2">
                <RadioGroupItem value={r} id={`reason-${r}`} />
                <Label htmlFor={`reason-${r}`} className="text-sm font-normal">
                  {t(`trade.report.reason.${r}`)}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-1.5">
            <Label htmlFor="report-detail" className="text-sm">
              {t("trade.report.detailLabel")}
            </Label>
            <Textarea
              id="report-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={t("trade.report.detailPlaceholder")}
              className="min-h-[80px]"
              maxLength={1000}
            />
          </div>

          <label className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
            <Checkbox
              checked={alsoBlock}
              onCheckedChange={(v) => setAlsoBlock(v === true)}
              className="mt-0.5"
            />
            <span className="text-xs">
              <span className="block font-medium">{t("trade.report.blockToo")}</span>
              <span className="block text-muted-foreground">
                {t("trade.report.blockTooHint")}
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            {t("trade.report.cancel")}
          </Button>
          <Button onClick={submit} disabled={isSending}>
            {isSending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {t("trade.report.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
