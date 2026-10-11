import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Sprout } from "lucide-react";
import { ItemDetailsModal } from "@/components/ItemDetailsModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfileCompanions, type ProfileCompanion } from "@/hooks/useOshi";
import { frameClass } from "@/utils/companion";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";
import { cn } from "@/lib/utils";

interface ProfileCompanionsProps {
  profileId: string;
  isOwnProfile: boolean;
}

/**
 * プロフィールの「相棒グッズ」。推しフォトの画面で育てている相棒（最大3つ）を、なかよし度と一緒に飾る。
 *
 * 以前は相棒は本人にしか見えず、育てても誰にも見せられなかった。
 * プロフィールを見られる人（本人 / 公開 / フォロワー限定でフォロー中）には見えるようにする。
 * 見出しは「相棒グッズ」にした。プロフィール上部のお気に入りの列がすでに「推し」という見出しなので、並ぶと区別がつかない。
 * - 相棒がいなければ、他の人のプロフィールでは何も出さない
 * - 自分のプロフィールでは、推しフォトの画面への控えめな案内だけ出す
 */
export function ProfileCompanions({ profileId, isOwnProfile }: ProfileCompanionsProps) {
  const { t } = useLanguage();
  const { data: companions = [], isLoading } = useProfileCompanions(profileId);
  const [detail, setDetail] = useState<ProfileCompanion | null>(null);

  if (isLoading) {
    if (!isOwnProfile) return null;
    return (
      <section className="mt-6 px-4">
        <Skeleton className="h-44 w-full rounded-2xl" />
      </section>
    );
  }

  if (companions.length === 0) {
    if (!isOwnProfile) return null;
    return (
      <section className="mt-6 px-4">
        <Link
          to="/oshi"
          className="flex items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted/50"
        >
          <Sprout className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1">{t("profileScreen.companions.emptyOwn")}</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-6 px-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sprout className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">{t("profileScreen.companions.title")}</h3>
          </div>
          {isOwnProfile && (
            <Link
              to="/oshi"
              className="tap-safe-y inline-flex items-center gap-0.5 text-2xs text-muted-foreground hover:text-foreground"
            >
              {t("profileScreen.companions.raise")}
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {/* ボタンは中身を縦の真ん中に寄せるので、名前の行数がちがうと写真の高さがずれる。上に揃える */}
        <div className="grid grid-cols-3 items-start gap-3">
          {companions.map((c) => (
            <button
              key={c.user_item_id}
              type="button"
              onClick={() => setDetail(c)}
              aria-label={t("profileScreen.companions.openItem", { name: c.title })}
              className="group min-w-0 text-left focus-visible:outline-none"
            >
              {/* 枠は推しフォトの画面と同じ（レベルが高いほど華やか） */}
              <span
                className={cn(
                  "relative block rounded-2xl p-[3px] transition-transform group-focus-visible:ring-2 group-focus-visible:ring-ring",
                  frameClass(c.level)
                )}
              >
                <span className="block aspect-square overflow-hidden rounded-[13px] bg-muted">
                  <img
                    src={getOptimizedImageUrl(c.image, { width: 240 })}
                    onError={fallbackToOriginal(c.image)}
                    loading="lazy"
                    decoding="async"
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </span>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-3xs font-bold tabular-nums text-primary-foreground shadow">
                  Lv.{c.level}
                </span>
              </span>
              <span className="mt-3 text-2xs font-medium leading-tight line-clamp-2">{c.title}</span>
              <span className="mt-0.5 block truncate text-3xs font-medium text-primary">
                {t(`engage.oshi.levelTitle.${c.level}`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {detail && (
        <ItemDetailsModal
          itemId={detail.user_item_id}
          title={detail.title}
          image={detail.image}
          contentName={detail.content_name}
          isUserItem
          userId={profileId}
          isOpen={!!detail}
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  );
}
