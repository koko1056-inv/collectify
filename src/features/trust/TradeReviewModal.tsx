import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Star } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

interface TradeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeRequestId: string;
  revieweeId: string;
  revieweeName?: string;
}

export function TradeReviewModal({
  isOpen,
  onClose,
  tradeRequestId,
  revieweeId,
  revieweeName,
}: TradeReviewModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user || rating === 0) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("trade_reviews").insert({
        trade_request_id: tradeRequestId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating,
        comment: comment.trim() || null,
      });
      if (error) {
        if (error.code === "23505") {
          toast(t("trade.trust.alreadyReviewed"));
          onClose();
          return;
        }
        throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["trust-score", revieweeId] });
      queryClient.invalidateQueries({ queryKey: ["trade-reviews", revieweeId] });
      toast.success(t("trade.trust.reviewSentTitle"), { description: t("trade.trust.reviewSentDesc") });
      onClose();
    } catch (e) {
      console.error(e);
      toast.error(t("trade.trust.sendFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t("trade.trust.reviewTitle")}</DialogTitle>
          <DialogDescription>
            {revieweeName
              ? t("trade.trust.reviewDescWithName", { name: revieweeName })
              : t("trade.trust.reviewDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1 py-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="p-1"
            >
              <Star
                className={`h-9 w-9 ${
                  (hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>

        <Textarea
          placeholder={t("trade.trust.commentPlaceholder")}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={300}
          rows={3}
        />
        <p className="text-xs text-muted-foreground text-right">{comment.length}/300</p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t("trade.trust.later")}
          </Button>
          <Button onClick={submit} disabled={rating === 0 || submitting}>
            {submitting ? t("trade.trust.submitting") : t("trade.trust.submitReview")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
