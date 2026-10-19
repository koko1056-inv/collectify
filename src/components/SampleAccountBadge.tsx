import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { pockeSrc } from "@/components/pocke/pockeAssets";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface SampleAccountBadgeProps {
  /** profiles.is_sample。falsy なら何も描画しない */
  isSample?: boolean | null;
  className?: string;
}

/**
 * 公式サンプルアカウント（運営のシミュレーターが動かすデモ用アカウント）を
 * 正直に示す小さなポッケのアイコン。名前の直後に置く。
 * タップ（モバイル）・ホバー（デスクトップ）どちらでも説明が出るよう、
 * Popover を開閉状態ごと自前で制御している。
 */
export function SampleAccountBadge({ isSample, className }: SampleAccountBadgeProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  if (!isSample) return null;

  const label = t("sampleAccount.tooltip");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* badge はカード／リンクの中に置かれることが多いので、button ではなく
            role="button" の span にして、入れ子の interactive 要素を避ける */}
        <span
          role="button"
          tabIndex={0}
          className={cn(
            "inline-flex h-[1em] w-[1em] shrink-0 translate-y-[0.05em] cursor-pointer items-center justify-center align-middle",
            className
          )}
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              setOpen((v) => !v);
            }
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          <img src={pockeSrc("peek")} alt="" className="h-full w-full object-contain" draggable={false} />
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-auto max-w-[240px] px-3 py-1.5 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {label}
      </PopoverContent>
    </Popover>
  );
}
