import { useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserItemDetailsModal } from "@/components/item-details/UserItemDetailsModal";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";
import type { OnThisDay } from "@/utils/memories";

interface OnThisDayItem {
  id: string;
  title: string | null;
  image: string | null;
}

interface OnThisDayCardProps {
  memory: OnThisDay<OnThisDayItem>;
  onDismiss: () => void;
}

/**
 * 「N年前の今日、○○をお迎えしました」。
 * お迎え日から自動で出すので、ユーザーが何かを入力する必要はない。
 * 開くたびに邪魔にならないよう、×で今日は閉じられる。
 */
export function OnThisDayCard({ memory, onDismiss }: OnThisDayCardProps) {
  const { t } = useLanguage();
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = memory.items.slice(0, 3);
  const first = shown[0];
  const opened = shown.find((i) => i.id === openId) ?? null;

  const headline = t(memory.exact ? "engage.memory.today" : "engage.memory.around", { n: memory.yearsAgo });
  const body =
    memory.items.length > 1
      ? t("engage.memory.many", { title: first.title ?? "", n: memory.items.length - 1 })
      : t("engage.memory.one", { title: first.title ?? "" });

  return (
    <section
      className="relative flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-3 pr-9"
      aria-label={headline}
    >
      <div className="flex shrink-0 -space-x-3">
        {shown.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenId(item.id)}
            aria-label={item.title ?? ""}
            className="relative h-14 w-14 overflow-hidden rounded-xl border-2 border-background bg-muted/40 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {item.image && (
              <img
                src={getOptimizedImageUrl(item.image, { width: 160 })}
                onError={fallbackToOriginal(item.image)}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-contain"
              />
            )}
          </button>
        ))}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-primary">{headline}</p>
        <p className="line-clamp-2 text-sm text-foreground">{body}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("engage.memory.dismiss")}
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-background/70 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      {opened && (
        <UserItemDetailsModal
          isOpen
          onClose={() => setOpenId(null)}
          itemId={opened.id}
          title={opened.title ?? ""}
          image={opened.image ?? ""}
        />
      )}
    </section>
  );
}
