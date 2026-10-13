import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Crown, DoorOpen, Pencil, Plus, Star } from "lucide-react";
import { bondSummary } from "@/lib/oshiLevel";
import { ItemDetailsModal } from "@/components/ItemDetailsModal";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfileOshiGoods, type ProfileOshiGoods as OshiGoodsItem } from "@/hooks/useOshi";
import { frameClass, MAX_OSHI_GOODS } from "@/utils/companion";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";
import { cn } from "@/lib/utils";
import { OshiGoodsEditModal } from "./OshiGoodsEditModal";
import { RankBadge } from "@/components/oshi/RankBadge";
import { OshiRoomViewDialog } from "@/components/oshi/room/OshiRoomViewDialog";

interface ProfileOshiGoodsProps {
  profileId: string;
  isOwnProfile: boolean;
  /** 他の人のプロフィールで「お部屋を見る」の見出しに使う名前 */
  ownerName?: string;
}

/**
 * プロフィールの「推しグッズ」（最大5つ・順位つき）。順位・なかよし度の枠・Lv・称号を一緒に飾る。
 *
 * 以前は同じ「いちばん好きなグッズ」を3か所で別々に見せていた:
 *  - お気に入りTOP5（マイページと、他の人のコレクションタブ）
 *  - 「推し」の丸アイコンの列（他の人のプロフィール上部）
 *  - 相棒グッズ（推しフォトで育てる3つ。なかよし度つき）
 * 推しグッズに1つにまとめたので、ここも1つにした。
 * - 本人: 「編集」で選ぶ・並べ替える画面を開く。空なら、選ぶよう控えめに案内する
 * - 他の人: 空なら何も出さない。見られるかどうかは get_profile_oshi_goods（プロフィールと同じ公開範囲）。
 *   「お部屋を見る」で、その人の推しの部屋を読み取りだけで開ける（本人は「育てる」から自分の部屋へ）
 */
export function ProfileOshiGoods({ profileId, isOwnProfile, ownerName = "" }: ProfileOshiGoodsProps) {
  const { t } = useLanguage();
  const { data: items = [], isLoading } = useProfileOshiGoods(profileId);
  const [editOpen, setEditOpen] = useState(false);
  const [detail, setDetail] = useState<OshiGoodsItem | null>(null);
  const [roomOpen, setRoomOpen] = useState(false);

  if (isLoading) {
    if (!isOwnProfile) return null;
    return (
      <section className="mt-6 px-4">
        <Skeleton className="h-52 w-full rounded-2xl" />
      </section>
    );
  }

  if (items.length === 0 && !isOwnProfile) return null;

  const bond = bondSummary(items.map((i) => i.level));
  // 同じレベルが並んだら順位の高いほう
  const bestItem = items.find((i) => i.level === bond.best);

  const editor = isOwnProfile && (
    <OshiGoodsEditModal open={editOpen} onOpenChange={setEditOpen} userId={profileId} />
  );

  // 本人で、まだ1つも選んでいないとき
  if (items.length === 0) {
    return (
      <section className="mt-6 px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4">
          <IconTile tone="primary" size="md">
            <Star />
          </IconTile>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{t("profileScreen.oshiGoods.title")}</p>
            <p className="text-2xs leading-relaxed text-muted-foreground">{t("profileScreen.oshiGoods.emptyOwn")}</p>
          </div>
          <Button size="sm" className="shrink-0 rounded-xl" onClick={() => setEditOpen(true)} data-tour="me-oshi-goods">
            {t("profileScreen.oshiGoods.choose")}
          </Button>
        </div>
        {editor}
      </section>
    );
  }

  return (
    <section className="mt-6 px-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {/* 推しグッズの星は primary（金色の points はポイントと評価の星のためにとっておく） */}
            <Star className="h-4 w-4 shrink-0 fill-primary text-primary" />
            <h3 className="truncate text-sm font-bold">{t("profileScreen.oshiGoods.title")}</h3>
            <span className="shrink-0 text-3xs tabular-nums text-muted-foreground">
              {items.length}/{MAX_OSHI_GOODS}
            </span>
          </div>
          {!isOwnProfile && (
            <Button size="sm" variant="ghost" onClick={() => setRoomOpen(true)} className="h-8 shrink-0 gap-1 px-2 text-xs">
              <DoorOpen className="h-3.5 w-3.5" />
              {t("oshiRoom.view.open")}
            </Button>
          )}
          {isOwnProfile && (
            <div className="flex shrink-0 items-center gap-0.5">
              <Link
                to="/oshi"
                className="tap-safe-y inline-flex items-center gap-0.5 px-1.5 text-2xs text-muted-foreground hover:text-foreground"
              >
                {t("profileScreen.oshiGoods.raise")}
                <ChevronRight className="h-3 w-3" />
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditOpen(true)}
                className="h-8 gap-1 px-2 text-xs"
                data-tour="me-oshi-goods"
              >
                <Pencil className="h-3 w-3" />
                {t("profileScreen.common.edit")}
              </Button>
            </div>
          )}
        </div>

        {/* 自慢の札: いちばん育てた推しグッズのレベル・称号と、推しグッズのなかよしLvの合計。
            育てた成果を、他の人がプロフィールを開いたときにひと目で分かるようにする（まだ全部 Lv1 なら出さない） */}
        {bond.best >= 2 && bestItem && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-muted/50 px-2 py-1.5" aria-label={t("profileScreen.oshiGoods.bondAria", { level: bond.best, title: t(`engage.oshi.levelTitle.${bond.best}`), name: bestItem.title, total: bond.total })}>
            <span className={cn("shrink-0 rounded-full p-[2px]", frameClass(bond.best))}>
              <span className="flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-2xs font-black leading-tight">
                <Crown className="h-3 w-3 text-points" />
                <span className="tabular-nums">Lv.{bond.best}</span>
                <span className="text-primary">{t(`engage.oshi.levelTitle.${bond.best}`)}</span>
              </span>
            </span>
            <span className="min-w-0 flex-1 truncate text-2xs text-muted-foreground">{bestItem.title}</span>
            <span className="shrink-0 text-2xs text-muted-foreground">
              {t("profileScreen.oshiGoods.bondTotal")} <span className="font-black tabular-nums text-foreground">{bond.total}</span>
            </span>
          </div>
        )}

        {/* 横に並べる（5つ並べると1つが小さくなりすぎるので、はみ出した分は横にすべらせる）。
            ボタンは中身を縦の真ん中に寄せるので、名前の行数がちがうと写真の高さがずれる。上に揃える */}
        <div className="-mx-1 flex items-start gap-3 overflow-x-auto px-1 pb-1 pt-1 scrollbar-hide">
          {items.map((item) => (
            <button
              key={item.user_item_id}
              type="button"
              onClick={() => setDetail(item)}
              aria-label={t("profileScreen.oshiGoods.openItem", { rank: item.rank, name: item.title })}
              className="group w-[6.25rem] shrink-0 text-left focus-visible:outline-none"
            >
              {/* 枠はレベルが高いほど華やか（推しの部屋では、同じ段階でフレームのまわりが光る） */}
              <span
                className={cn(
                  "relative block rounded-2xl p-[3px] transition-transform group-focus-visible:ring-2 group-focus-visible:ring-ring",
                  frameClass(item.level)
                )}
              >
                <span className="block aspect-square overflow-hidden rounded-[13px] bg-muted">
                  <img
                    src={getOptimizedImageUrl(item.image, { width: 240 })}
                    onError={fallbackToOriginal(item.image)}
                    loading="lazy"
                    decoding="async"
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </span>
                <RankBadge rank={item.rank} className="absolute -left-1 -top-1" />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-3xs font-bold tabular-nums text-primary-foreground shadow">
                  Lv.{item.level}
                </span>
              </span>
              <span className="mt-3 block text-2xs font-medium leading-tight line-clamp-2">{item.title}</span>
              <span className="mt-0.5 block truncate text-3xs font-medium text-primary">
                {t(`engage.oshi.levelTitle.${item.level}`)}
              </span>
            </button>
          ))}

          {/* 本人で、まだ枠が空いているとき */}
          {isOwnProfile && items.length < MAX_OSHI_GOODS && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex aspect-square w-[6.25rem] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5"
            >
              <Plus className="h-5 w-5" />
              <span className="text-3xs">{t("profileScreen.common.add")}</span>
            </button>
          )}
        </div>
      </div>

      {editor}

      {!isOwnProfile && <OshiRoomViewDialog profileId={profileId} name={ownerName} open={roomOpen} onOpenChange={setRoomOpen} />}

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
