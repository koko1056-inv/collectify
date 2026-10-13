import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Crown, Heart, Share2 } from "lucide-react";
import { toast } from "sonner";
import { bondSummary } from "@/lib/oshiLevel";
import { FX_DURATION, type RoomFxEvent } from "./fx";
import { useReducedMotion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfileOshiGoods } from "@/hooks/useOshi";
import { useProfileOshiRoom } from "@/hooks/useOshiRoom";
import { oshiRoomUrl, roomStateFrom, sceneGoodsMap, useOshiRoomLikes, type OshiRoomCard } from "@/hooks/useOshiRoomSocial";
import { timeOfDayJst, type RoomState } from "@/lib/oshiRoom";
import { getInitial } from "@/utils/initial";
import { shareContent } from "@/utils/share";
import { RoomScene } from "./RoomScene";
import { RoomLikeButton } from "./RoomLikeButton";
import { ItemDetailsModal } from "@/components/ItemDetailsModal";
import type { ProfileOshiGoods } from "@/hooks/useOshi";

/**
 * 他の人の推しの部屋を見る（読み取りだけ）。プロフィールの推しグッズ欄の「お部屋を見る」と、「みんな」のお部屋タブから開く。
 * 見られる範囲は get_profile_oshi_room（コレクションと同じ公開範囲）。グッズをタップすると名前となかよし度が出る。
 * 部屋の下に、持ち主（プロフィールへ）・シェア・いいね。
 * card を渡したとき（一覧から開いたとき）は、一覧で受け取った部屋をそのまま描く（もう一度読みに行かない）
 */
export function OshiRoomViewDialog({
  profileId,
  name,
  open,
  onOpenChange,
  card,
  username,
  avatarUrl,
}: {
  profileId: string;
  name: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  card?: OshiRoomCard | null;
  username?: string | null;
  avatarUrl?: string | null;
}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const reduceMotion = !!useReducedMotion();
  const fetchRoom = open && !card;
  const room = useProfileOshiRoom(fetchRoom ? profileId : undefined);
  const goods = useProfileOshiGoods(fetchRoom ? profileId : undefined);
  const likes = useOshiRoomLikes(open && user?.id === profileId ? profileId : undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProfileOshiGoods | null>(null);
  const isOwn = user?.id === profileId;

  const list = useMemo<ProfileOshiGoods[]>(
    () =>
      card
        ? card.goods.map((g) => ({ rank: g.rank, user_item_id: g.user_item_id, title: g.title, image: g.image, content_name: g.content_name, xp: 0, level: g.level }))
        : (goods.data ?? []),
    [card, goods.data]
  );
  const ids = useMemo(() => list.map((g) => g.user_item_id), [list]);
  const map = useMemo(() => sceneGoodsMap(list), [list]);
  const state = useMemo<RoomState | null>(() => {
    if (card) return card.state;
    if (!room.data) return null;
    return roomStateFrom(room.data.wallpaper, room.data.floor, room.data.layout, ids);
  }, [card, room.data, ids]);
  const oshiColor = card?.oshiColor ?? room.data?.oshiColor ?? "pink";
  const picked = list.find((g) => g.user_item_id === selected);
  const bond = bondSummary(list.map((g) => g.level));
  const loading = !card && (room.isLoading || goods.isLoading);

  // タップしたグッズの反応（自分の部屋と同じく、なかよしレベルで豊かになる）。吹き出しには持ち主のひとことではなく称号を出す
  const [fx, setFx] = useState<RoomFxEvent[]>([]);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const react = (g: ProfileOshiGoods) => {
    const id = Date.now() + Math.random();
    setFx((prev) => [...prev.filter((e) => e.item !== g.user_item_id), { id, kind: "react", item: g.user_item_id, level: g.level, viewer: true }]);
    timers.current.push(window.setTimeout(() => setFx((prev) => prev.filter((e) => e.id !== id)), FX_DURATION.react));
  };

  // 選んでいるグッズをもう一度タップすると詳細を開く（自分の部屋と同じ）
  const selectGoods = (id: string) => {
    if (id === selected && picked) {
      setDetail(picked);
      return;
    }
    setSelected(id);
    const g = list.find((v) => v.user_item_id === id);
    if (g) react(g);
  };

  const share = async () => {
    const result = await shareContent({
      title: t("oshiRoom.view.title", { name }),
      text: t("oshiRoom.social.shareText", { name }),
      url: oshiRoomUrl(profileId),
    });
    if (result === "copied") toast.success(t("oshiRoom.social.copied"));
    else if (result === "failed") toast.error(t("oshiRoom.social.shareFailed"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto p-4">
        <DialogHeader className="text-left">
          <DialogTitle>{t("oshiRoom.view.title", { name })}</DialogTitle>
          <DialogDescription>{t("oshiRoom.view.tapHint")}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <Skeleton className="aspect-[360/420] w-full rounded-3xl" />
        ) : !state ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("oshiRoom.view.unavailable")}</p>
        ) : (
          <>
            <div className="relative">
              <RoomScene
                state={state}
                goods={map}
                oshi={oshiColor}
                time={timeOfDayJst()}
                mode="readonly"
                reduceMotion={reduceMotion}
                selectedGoods={selected}
                onSelectGoods={selectGoods}
                fx={fx}
                label={t("oshiRoom.roomAriaOf", { name })}
              />
              {/* 部屋の札: なかよしLvの合計と、いちばん育てた推しのレベル（自慢の見せどころ） */}
              {list.length > 0 && (
                <span className="pointer-events-none absolute left-2.5 top-2.5 z-40 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-2xs font-bold shadow-sm backdrop-blur-sm">
                  <Crown className="h-3.5 w-3.5 text-points" />
                  <span>
                    {t("oshiRoom.view.bondTotal")} <span className="tabular-nums text-primary">{bond.total}</span>
                  </span>
                  {bond.best >= 2 && (
                    <span className="rounded-full bg-primary px-1.5 py-px text-3xs tabular-nums text-primary-foreground">{t("oshiRoom.view.bondBest", { level: bond.best })}</span>
                  )}
                </span>
              )}
            </div>

            {/* 持ち主（プロフィールへ）・シェア・いいね */}
            <div className="flex items-center gap-2">
              <Link
                to={`/user/${profileId}`}
                onClick={() => onOpenChange(false)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-full py-1 pr-2 transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={`${name}（${t("oshiRoom.social.profile")}）`}
              >
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarImage src={avatarUrl ?? card?.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-secondary text-2xs text-secondary-foreground">{getInitial(name, username ?? card?.username)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{name}</span>
                  <span className="flex items-center gap-0.5 text-2xs text-muted-foreground">
                    {t("oshiRoom.social.profile")}
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </span>
              </Link>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={() => void share()} aria-label={t("oshiRoom.social.share")}>
                <Share2 className="h-4 w-4" />
              </Button>
              {isOwn ? (
                // 自分の部屋にはいいねできない。数だけ見せる
                <span className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-bold tabular-nums">
                  <Heart className="h-5 w-5 text-primary" />
                  {likes.data?.likes ?? 0}
                </span>
              ) : (
                <RoomLikeButton ownerId={profileId} initial={card ? { likes: card.likes, likedByMe: card.likedByMe } : undefined} className="shrink-0" />
              )}
            </div>

            <div className="min-h-[3rem] rounded-2xl bg-muted/50 px-3 py-2 text-center" aria-live="polite">
              {picked ? (
                <>
                  <p className="line-clamp-1 text-sm font-bold">
                    {picked.rank}. {picked.title}
                  </p>
                  <p className="text-xs font-bold text-primary">
                    Lv.{picked.level} {t(`engage.oshi.levelTitle.${picked.level}`)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setDetail(picked)}
                    className="mt-1 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-2xs font-bold text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {t("oshiRoom.view.detail")}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <p className="py-1.5 text-xs text-muted-foreground">{list.length === 0 ? t("oshiRoom.view.empty") : t("oshiRoom.view.tapHint")}</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
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
    </Dialog>
  );
}
