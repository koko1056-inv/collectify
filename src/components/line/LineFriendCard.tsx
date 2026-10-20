import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLineFriendPrompt } from "@/hooks/useLineFriendPrompt";
import { cn } from "@/lib/utils";

/**
 * LINE友だち追加の案内カード。VITE_LINE_OA_BASIC_ID が未設定なら何も出さない。
 * ウェルカムオンボーディングの最後と、デイリーログイン報酬を受け取った直後に出す。
 * 閉じたら7日間は出さない（localStorage）。すでに friend_added なら出ない。
 */
export function LineFriendCard({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { shouldShow, openAddFriend, dismiss } = useLineFriendPrompt();
  const [hiddenNow, setHiddenNow] = useState(false);

  if (!shouldShow || hiddenNow) return null;

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-2xl border border-[#06C755]/30 bg-[#06C755]/10 p-3 text-left",
        className
      )}
    >
      <button
        type="button"
        aria-label={t("lineConnect.friendCard.dismiss")}
        onClick={() => {
          dismiss();
          setHiddenNow(true);
        }}
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-background/60"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1 pr-5">
        <p className="text-sm font-bold leading-snug">{t("lineConnect.friendCard.title")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("lineConnect.friendCard.desc")}</p>
        <Button
          size="sm"
          onClick={openAddFriend}
          className="mt-2 rounded-full bg-[#06C755] text-white hover:bg-[#05b34c]"
        >
          {t("lineConnect.friendCard.cta")}
        </Button>
      </div>
    </div>
  );
}
