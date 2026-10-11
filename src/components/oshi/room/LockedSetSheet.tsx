import { Lock } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PointIcon } from "@/components/ui/point-icon";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnlockItems } from "@/hooks/useCosmetics";
import { ROOM_ASSETS, roomI18nId, roomUnlockKey, type RoomSet } from "@/lib/oshiRoom";
import type { OshiColor } from "@/lib/cosmetics";
import { RoomSetPreview } from "./RoomSetPreview";

/**
 * まだ持っていないセットの物を押したときの案内。セットの見本・中身・値段を見せて、ショップの該当商品へ送る。
 * ここでは買わない（ポイントを使う確認は、ショップの画面の決まった流れでする）
 */
export function LockedSetSheet({
  set,
  oshi,
  onOpenChange,
  onGoShop,
}: {
  set: RoomSet | null;
  oshi: OshiColor;
  onOpenChange: (open: boolean) => void;
  onGoShop: (unlockKey: string) => void;
}) {
  const { t } = useLanguage();
  const { byKey } = useUnlockItems();
  const key = set ? roomUnlockKey(set) : null;
  const item = key ? byKey.get(key) : undefined;
  const contents = set ? ROOM_ASSETS.filter((a) => a.set === set) : [];
  return (
    <Sheet open={!!set} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[90vh] max-w-lg overflow-y-auto rounded-t-3xl px-4 pt-5">
        {set && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-muted-foreground" />
                {t("oshiRoom.lockedSheet.title", { name: t(`oshiRoom.sets.${set}`) })}
              </SheetTitle>
              <SheetDescription>{t("oshiRoom.lockedSheet.desc")}</SheetDescription>
            </SheetHeader>
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
            <div className="mt-4 flex gap-2 pb-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
                {t("oshiRoom.lockedSheet.close")}
              </Button>
              <Button className="flex-1 gap-1.5 rounded-xl" onClick={() => key && onGoShop(key)}>
                <PointIcon size={14} />
                {t("oshiRoom.lockedSheet.toShop")}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
