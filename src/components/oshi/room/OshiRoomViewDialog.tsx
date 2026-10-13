import { useEffect, useMemo, useRef, useState } from "react";
import { Crown } from "lucide-react";
import { bondSummary } from "@/lib/oshiLevel";
import { FX_DURATION, type RoomFxEvent } from "./fx";
import { useReducedMotion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfileOshiGoods } from "@/hooks/useOshi";
import { useProfileOshiRoom } from "@/hooks/useOshiRoom";
import { DEFAULT_FLOOR, DEFAULT_WALLPAPER, defaultLayout, mergeGoods, timeOfDayJst, type RoomState } from "@/lib/oshiRoom";
import { RoomScene, type SceneGoods } from "./RoomScene";
import { ChevronRight } from "lucide-react";
import { ItemDetailsModal } from "@/components/ItemDetailsModal";
import type { ProfileOshiGoods } from "@/hooks/useOshi";

/**
 * 他の人の推しの部屋を見る（読み取りだけ）。プロフィールの推しグッズ欄の「お部屋を見る」から開く。
 * 見られる範囲は get_profile_oshi_room（コレクションと同じ公開範囲）。グッズをタップすると名前となかよし度が出る
 */
export function OshiRoomViewDialog({ profileId, name, open, onOpenChange }: { profileId: string; name: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useLanguage();
  const reduceMotion = !!useReducedMotion();
  const room = useProfileOshiRoom(open ? profileId : undefined);
  const goods = useProfileOshiGoods(open ? profileId : undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProfileOshiGoods | null>(null);

  const list = useMemo(() => goods.data ?? [], [goods.data]);
  const ids = useMemo(() => list.map((g) => g.user_item_id), [list]);
  const map = useMemo(() => {
    const m = new Map<string, SceneGoods>();
    for (const g of list) m.set(g.user_item_id, { title: g.title, image: g.image, level: g.level, rank: g.rank });
    return m;
  }, [list]);
  const state = useMemo<RoomState | null>(() => {
    if (!room.data) return null;
    return {
      wallpaper: room.data.wallpaper ?? DEFAULT_WALLPAPER,
      floor: room.data.floor ?? DEFAULT_FLOOR,
      layout: room.data.layout ? mergeGoods(room.data.layout, ids) : defaultLayout(ids),
    };
  }, [room.data, ids]);
  const picked = list.find((g) => g.user_item_id === selected);
  const bond = bondSummary(list.map((g) => g.level));

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto p-4">
        <DialogHeader className="text-left">
          <DialogTitle>{t("oshiRoom.view.title", { name })}</DialogTitle>
          <DialogDescription>{t("oshiRoom.view.tapHint")}</DialogDescription>
        </DialogHeader>
        {room.isLoading || goods.isLoading ? (
          <Skeleton className="aspect-[360/420] w-full rounded-3xl" />
        ) : !state ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("oshiRoom.view.unavailable")}</p>
        ) : (
          <>
            <div className="relative">
              <RoomScene
                state={state}
                goods={map}
                oshi={room.data?.oshiColor ?? "pink"}
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
