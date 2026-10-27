import { useLocation, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { PockeSays } from "@/components/pocke/Pocke";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishToggle } from "@/hooks/useWishToggle";
import { wishButtonState } from "@/utils/characterPage";
import { cn } from "@/lib/utils";

interface WishToggleButtonProps {
  officialItemId: string;
  /** もう持っているか（持っているものには出さない） */
  owned: boolean;
  className?: string;
}

/**
 * カタログカードの画像の右上に重ねる「ほしい」ボタン（ハート）。
 * 画像の上に絶対配置するので、カードの高さは変わらない（3 列のグリッドでも並びがずれない）。
 * 見た目は 28px の丸だが、押せる範囲は 40px 四方。
 *  - 持っている: 出さない
 *  - ゲスト: 押すとポッケが登録をすすめる
 *  - ほか: 押すたびに入れる・外す（すぐに見た目が変わり、ポッケが一言）
 */
export function WishToggleButton({ officialItemId, owned, className }: WishToggleButtonProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { wishedIds, isGuest, toggle, isPending } = useWishToggle();
  const state = wishButtonState({ isGuest, owned, wishedIds, id: officialItemId });
  if (state === "hidden") return null;

  const on = state === "on";
  const label = on ? t("catalogWish.remove") : t("catalogWish.add");
  const face = (
    <span
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full shadow-sm ring-1 transition-colors",
        on ? "bg-primary text-primary-foreground ring-primary" : "bg-background/90 text-muted-foreground ring-border"
      )}
    >
      <Heart className={cn("h-3.5 w-3.5", on && "fill-current")} aria-hidden="true" />
    </span>
  );
  const buttonClass = cn(
    "absolute right-0 top-0 z-10 flex h-10 w-10 items-start justify-end p-1 focus-visible:outline-none [&:focus-visible>span]:ring-2 [&:focus-visible>span]:ring-ring",
    className
  );

  if (state === "guest") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={buttonClass}
            aria-label={t("catalogWish.add")}
            data-wish-toggle="guest"
            onClick={(e) => e.stopPropagation()}
          >
            {face}
          </button>
        </PopoverTrigger>
        {/* ポップオーバーはポータルの中でも React のイベントはカードまで届くので、ここで止める（詳細が開かないように） */}
        <PopoverContent className="w-64 p-3" align="end" onClick={(e) => e.stopPropagation()}>
          <PockeSays pose="wave" height={52} bubbleClassName="text-xs">
            <span className="block">{t("catalogWish.guestNudge")}</span>
            <Button
              size="sm"
              className="mt-1.5 h-7 px-3 text-xs"
              onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)}
            >
              {t("catalogWish.guestCta")}
            </Button>
          </PockeSays>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <button
      type="button"
      className={buttonClass}
      aria-label={label}
      aria-pressed={on}
      title={label}
      data-wish-toggle={on ? "on" : "off"}
      disabled={isPending(officialItemId)}
      onClick={(e) => {
        e.stopPropagation();
        void toggle(officialItemId);
      }}
    >
      {face}
    </button>
  );
}
