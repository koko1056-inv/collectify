import { Gift, Lock } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PointIcon } from "@/components/ui/point-icon";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnlockItems } from "@/hooks/useCosmetics";
import { ROOM_ASSETS, roomI18nId, roomItemUnlockKey, roomUnlockKey, setUnlockLevel, type RoomSet } from "@/lib/oshiRoom";
import type { OshiColor } from "@/lib/cosmetics";
import { RoomSetPreview } from "./RoomSetPreview";
import { AssetThumb } from "./AssetThumb";

/**
 * まだ持っていない物を押したときの案内。
 *  - ショップのセット: セットの見本・中身・値段を見せて、ショップの該当商品へ送る。その物が単品でも売っていれば、単品の値段と導線も出す
 *  - なかよしレベルの特典: 「どれか1つの推しグッズを LvN まで育てると解放」と中身を見せる（ショップでは買えない）
 * ここでは買わない（ポイントを使う確認は、ショップの画面の決まった流れでする）
 */
export function LockedSetSheet({
  set,
  itemKey,
  oshi,
  onOpenChange,
  onGoShop,
}: {
  set: RoomSet | null;
  /** 押した物（単品の導線に使う） */
  itemKey?: string | null;
  oshi: OshiColor;
  onOpenChange: (open: boolean) => void;
  onGoShop: (unlockKey: string) => void;
}) {
  const { t } = useLanguage();
  const { byKey } = useUnlockItems();
  const level = set ? setUnlockLevel(set) : null;
  const key = set && level === null ? roomUnlockKey(set) : null;
  const item = key ? byKey.get(key) : undefined;
  const singleKey = itemKey && level === null ? roomItemUnlockKey(itemKey) : null;
  const single = singleKey ? byKey.get(singleKey) : undefined;
  const contents = set ? ROOM_ASSETS.filter((a) => a.set === set) : [];
  return (
    <Sheet open={!!set} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[90vh] max-w-lg overflow-y-auto rounded-t-3xl px-4 pt-5">
        {set && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="flex items-center gap-1.5">
                {level !== null ? <Gift className="h-4 w-4 text-points" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                {level !== null ? t("oshiRoom.lockedSheet.levelTitle", { level }) : t("oshiRoom.lockedSheet.title", { name: t(`oshiRoom.sets.${set}`) })}
              </SheetTitle>
              <SheetDescription>{level !== null ? t("oshiRoom.lockedSheet.levelDesc", { level }) : t("oshiRoom.lockedSheet.desc")}</SheetDescription>
            </SheetHeader>
            {level !== null ? (
              // レベルの特典は部屋の見本ではなく、中身を1つずつ並べる（家具だけ・壁紙だけのレベルもあるため）
              <div className="mt-4 flex flex-wrap gap-3">
                {contents.map((a) => (
                  <span key={a.key} className="flex w-20 flex-col items-center gap-1">
                    <AssetThumb k={a.key} oshi={oshi} className="h-16 w-16 overflow-hidden rounded-2xl bg-muted/60 ring-1 ring-points/30" />
                    <span className="w-full truncate text-center text-2xs font-medium">{t(`oshiRoom.assets.${roomI18nId(a.key)}`)}</span>
                    <span className="text-3xs text-muted-foreground">{t(`oshiRoom.kind.${a.kind}`)}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex gap-3">
                <div className="w-32 shrink-0 overflow-hidden rounded-2xl border">
                  <RoomSetPreview set={set} oshi={oshi} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-muted-foreground">{t("oshiRoom.lockedSheet.contents")}</p>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {contents.map((a) => (
                      <li key={a.key} className="flex gap-1.5">
                        <span className="shrink-0 text-muted-foreground">{t(`oshiRoom.kind.${a.kind}`)}</span>
                        <span className="truncate font-medium">{t(`oshiRoom.assets.${roomI18nId(a.key)}`)}</span>
                      </li>
                    ))}
                  </ul>
                  {item && (
                    <p className="mt-2 inline-flex items-center gap-1 text-base font-bold tabular-nums">
                      <PointIcon size={16} />
                      {item.points_cost}
                      <span className="text-xs font-normal text-muted-foreground">pt</span>
                    </p>
                  )}
                </div>
              </div>
            )}
            {single && itemKey && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs">
                <AssetThumb k={itemKey} oshi={oshi} className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-background" />
                <span className="min-w-0 flex-1">{t("oshiRoom.lockedSheet.single", { name: t(`oshiRoom.assets.${roomI18nId(itemKey)}`), n: single.points_cost })}</span>
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 pb-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
                {t("oshiRoom.lockedSheet.close")}
              </Button>
              {single && singleKey && (
                <Button variant="secondary" className="flex-1 gap-1.5 rounded-xl" onClick={() => onGoShop(singleKey)}>
                  <PointIcon size={14} />
                  {t("oshiRoom.lockedSheet.toShopSingle")}
                </Button>
              )}
              {key && (
                <Button className="flex-1 gap-1.5 rounded-xl" onClick={() => onGoShop(key)}>
                  <PointIcon size={14} />
                  {t("oshiRoom.lockedSheet.toShop")}
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
