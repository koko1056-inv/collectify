import { useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfileOshiGoods } from "@/hooks/useOshi";
import { useProfileOshiRoom } from "@/hooks/useOshiRoom";
import { DEFAULT_FLOOR, DEFAULT_WALLPAPER, defaultLayout, mergeGoods, timeOfDayJst, type RoomState } from "@/lib/oshiRoom";
import { RoomScene, type SceneGoods } from "./RoomScene";

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
            <RoomScene
              state={state}
              goods={map}
              oshi={room.data?.oshiColor ?? "pink"}
              time={timeOfDayJst()}
              mode="readonly"
              reduceMotion={reduceMotion}
              selectedGoods={selected}
              onSelectGoods={setSelected}
              label={t("oshiRoom.roomAriaOf", { name })}
            />
            <div className="min-h-[3rem] rounded-2xl bg-muted/50 px-3 py-2 text-center" aria-live="polite">
              {picked ? (
                <>
                  <p className="line-clamp-1 text-sm font-bold">
                    {picked.rank}. {picked.title}
                  </p>
                  <p className="text-xs font-bold text-primary">
                    Lv.{picked.level} {t(`engage.oshi.levelTitle.${picked.level}`)}
                  </p>
                </>
              ) : (
                <p className="py-1.5 text-xs text-muted-foreground">{list.length === 0 ? t("oshiRoom.view.empty") : t("oshiRoom.view.tapHint")}</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
