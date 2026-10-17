import { Link } from "react-router-dom";
import { Check, Moon, Package, Sparkles, Tag as TagIcon } from "lucide-react";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PointIcon } from "@/components/ui/point-icon";
import { IconTile } from "@/components/ui/icon-tile";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useMyUnlocks } from "@/hooks/useCosmetics";
import type { PointShopItem } from "@/hooks/usePointShop";
import { CoverArt } from "@/components/cosmetics/CoverArt";
import { RoomSetPreview } from "@/components/oshi/room/RoomSetPreview";
import { AvatarFrame } from "@/components/cosmetics/AvatarFrame";
import {
  DEFAULT_SHARE_PALETTE,
  SHARE_TEMPLATE_PALETTES,
  cosmeticI18nId,
  isCoverKey,
  isFrameKey,
  isRoomSetKey,
  isShareTemplateKey,
} from "@/lib/cosmetics";
import { roomAsset, roomI18nId, roomItemFromUnlockKey, roomUnlockKey, type RoomSet } from "@/lib/oshiRoom";
import { AssetThumb } from "@/components/oshi/room/AssetThumb";

/**
 * 棚の並び。DB の category と同じ値。ただし「お部屋」（推しの部屋のセット）は DB では category = 'cosmetic' のまま入れていて
 * （棚の CHECK を広げずに足すため）、unlock_key の頭（room:）で分ける。
 * 「お部屋の単品」（家具・フレーム1つ。room:<目録の key>）はセットの棚とは別に並べる（セットとくらべて選べるように、すぐ下）
 */
const CATEGORIES = ["room", "roomItem", "cosmetic", "share", "capacity"] as const;

/**
 * ポイントで交換できるアイテムを棚（枠をふやす / 着せ替え / シェアカード）ごとに並べる。
 * 着せ替えは小さな見本を添え、解放済みなら「所持済み」にする（買い切りなので二度は買えない）。
 * 名前と説明は、着せ替えは翻訳から、枠などは DB の文言をそのまま出す。
 */
export function ShopItemGroups({
  items,
  currentPoints,
  pending,
  onExchange,
  highlightKey,
}: {
  items: PointShopItem[];
  currentPoints: number;
  pending: boolean;
  /** 推しの部屋の鍵の案内から来たとき、その商品を目立たせる（unlock_key） */
  highlightKey?: string | null;
  /** 交換の確認を開く。名前・説明は画面の言語に合わせたものに差し替えて渡す */
  onExchange: (item: PointShopItem) => void;
}) {
  const { t } = useLanguage();
  const { owned } = useMyUnlocks();

  const label = (item: PointShopItem): { name: string; desc: string | null; short?: string } => {
    const key = item.unlock_key;
    if (!key) return { name: item.name, desc: item.description };
    // 単品は、部屋の目録の名前を使う（cosmetics.items に同じ名前を二重に持たない）
    const asset = roomItemFromUnlockKey(key);
    if (asset) {
      const meta = roomAsset(asset)!;
      const assetName = t(`oshiRoom.assets.${roomI18nId(asset)}`);
      return {
        name: t("cosmetics.kind.roomItem", { name: assetName }),
        desc: t("cosmetics.roomItemDesc", { kind: t(`oshiRoom.kind.${meta.kind}`), set: t(`oshiRoom.sets.${meta.set}`) }),
        short: assetName,
      };
    }
    const id = cosmeticI18nId(key);
    const kind = key.split(":")[0];
    return {
      name: t(`cosmetics.kind.${kind}`, { name: t(`cosmetics.items.${id}.name`) }),
      desc: t(`cosmetics.items.${id}.desc`),
    };
  };

  // 知らない棚の商品は「枠をふやす」に入れる（出し忘れを防ぐ）
  const shelfOf = (i: PointShopItem) =>
    isRoomSetKey(i.unlock_key)
      ? "room"
      : roomItemFromUnlockKey(i.unlock_key)
        ? "roomItem"
        : (CATEGORIES as readonly string[]).includes(i.category)
        ? i.category
        : "capacity";
  const groups = CATEGORIES.map((c) => ({
    category: c,
    items: items.filter((i) => shelfOf(i) === c),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.category}>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{t(`cosmetics.shop.${g.category}`)}</h3>
          {g.category === "capacity" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {g.items.map((item) => {
                const affordable = currentPoints >= item.points_cost;
                const { name, desc } = label(item);
                return (
                  <Card key={item.id}>
                    <CardHeader className="flex-row items-start gap-3 space-y-0 pb-2">
                      <ItemPreview item={item} />
                      <div className="min-w-0 flex-1 space-y-1">
                        <CardTitle className="text-base leading-snug">{name}</CardTitle>
                        {desc && <CardDescription className="text-xs">{desc}</CardDescription>}
                      </div>
                    </CardHeader>
                    <CardFooter className="flex items-center justify-between pt-0">
                      <PriceBadge cost={item.points_cost} />
                      <Button
                        size="sm"
                        disabled={!affordable || pending}
                        onClick={() => onExchange({ ...item, name, description: desc })}
                      >
                        {affordable
                          ? t("screens.pointShop.exchangeBuy")
                          : t("screens.pointShop.exchangeInsufficient")}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            // 着せ替え・シェアカードは見本が主役。数が多いので2列（広い画面は3列）の小さな札で並べる
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {g.items.map((item) => {
                const single = roomItemFromUnlockKey(item.unlock_key);
                // 単品は、その物の入ったセットを持っていれば買う意味がないので「所持済み」にする
                const isOwned =
                  !!item.unlock_key && (owned.has(item.unlock_key) || (!!single && owned.has(roomUnlockKey(roomAsset(single)!.set))));
                const affordable = currentPoints >= item.points_cost;
                const { name, desc, short } = label(item);
                const shortName = short ?? (item.unlock_key ? t(`cosmetics.items.${cosmeticI18nId(item.unlock_key)}.name`) : name);
                const highlighted = !!highlightKey && item.unlock_key === highlightKey;
                return (
                  <Card
                    key={item.id}
                    id={item.unlock_key ? `shop-${item.unlock_key.replace(":", "-")}` : undefined}
                    className={cn("flex flex-col gap-2 p-2 transition-shadow", highlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background")}
                  >
                    <ItemPreview item={item} large />
                    <div className="flex min-w-0 items-center justify-between gap-1 px-0.5">
                      <span className="truncate text-sm font-semibold">{shortName}</span>
                      <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold tabular-nums">
                        <PointIcon size={12} />
                        {item.points_cost}
                      </span>
                    </div>
                    {single && <p className="-mt-1 truncate px-0.5 text-3xs text-muted-foreground">{desc}</p>}
                    {isOwned && (isRoomSetKey(item.unlock_key) || single) ? (
                      // お部屋のセットは、買ったらすぐ部屋で使えるよう、推しの部屋へ送る
                      <Button asChild size="sm" variant="secondary" className="h-8 w-full gap-1 text-xs">
                        <Link to="/oshi">
                          <Check className="h-3.5 w-3.5 text-success" />
                          {t("cosmetics.shop.useRoom")}
                        </Link>
                      </Button>
                    ) : isOwned ? (
                      <span className="flex h-8 items-center justify-center gap-1 rounded-md bg-success-soft text-xs font-medium text-success">
                        <Check className="h-3.5 w-3.5" />
                        {t("cosmetics.shop.owned")}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant={affordable ? "default" : "secondary"}
                        className="h-8 w-full text-xs"
                        disabled={!affordable || pending}
                        onClick={() => onExchange({ ...item, name, description: desc })}
                        aria-label={`${name} ${item.points_cost}pt`}
                      >
                        {affordable
                          ? t("screens.pointShop.exchangeBuy")
                          : t("screens.pointShop.exchangeInsufficient")}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PriceBadge({ cost }: { cost: number }) {
  return (
    <Badge variant="secondary" className="gap-1 tabular-nums">
      <PointIcon size={14} />
      {cost}pt
    </Badge>
  );
}

/** 小さな見本。カバーは柄、縁はアイコンの輪、シェアカードは紙と色の札、枠は印 */
function ItemPreview({ item, large }: { item: PointShopItem; large?: boolean }) {
  const key = item.unlock_key;
  const box = large ? "h-20 w-full" : "h-12 w-16";
  const single = roomItemFromUnlockKey(key);
  if (single) {
    // 単品は、その物だけを大きめに（壁紙・床ではないので、部屋の絵ではなく物の見本）
    return <AssetThumb k={single} className={cn("shrink-0 overflow-hidden rounded-lg bg-muted/60 ring-1 ring-inset ring-foreground/10", large ? "h-32 w-full" : "h-12 w-16")} />;
  }
  if (isRoomSetKey(key)) {
    // 部屋は縦長なので、札では下のほう（家具・フレーム・床）を横長に切り取って見せる
    return (
      <span className={cn("relative flex shrink-0 items-end overflow-hidden rounded-lg ring-1 ring-inset ring-foreground/10", large ? "h-32 w-full" : "h-12 w-16")}>
        <RoomSetPreview set={key.slice("room:".length) as RoomSet} className="w-full shrink-0" />
      </span>
    );
  }
  if (isCoverKey(key)) {
    return (
      <span className={cn("relative block shrink-0 overflow-hidden rounded-lg ring-1 ring-inset ring-foreground/10", box)}>
        <CoverArt coverKey={key} />
      </span>
    );
  }
  if (isFrameKey(key)) {
    return (
      <span className={cn("flex shrink-0 items-center justify-center rounded-lg bg-muted/60", box)}>
        <AvatarFrame frameKey={key} thickness={large ? 4 : 3}>
          <span className={cn("block rounded-full border-2 border-card bg-muted", large ? "h-12 w-12" : "h-8 w-8")} />
        </AvatarFrame>
      </span>
    );
  }
  if (isShareTemplateKey(key)) {
    const p = SHARE_TEMPLATE_PALETTES[key] ?? DEFAULT_SHARE_PALETTE;
    return (
      <span className={cn("flex shrink-0 items-center justify-center rounded-lg bg-muted/60", box)}>
        <span
          aria-hidden="true"
          className={cn(
            "relative block overflow-hidden rounded ring-1 ring-inset ring-foreground/10 shadow-sm",
            large ? "h-16 w-12" : "h-10 w-8"
          )}
          style={{ backgroundColor: p.paper }}
        >
          <span className="absolute left-1 right-1 top-1.5 h-1 rounded-full" style={{ backgroundColor: p.ink, opacity: 0.8 }} />
          <span className="absolute left-1 top-3.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.accent }} />
          <span className="absolute bottom-1.5 left-1 right-1 h-1 rounded-full" style={{ backgroundColor: p.track }} />
        </span>
      </span>
    );
  }
  const Icon =
    item.item_type === "custom_tags"
      ? TagIcon
      : item.item_type === "collection_slots"
        ? Package
        : item.item_type === "streak_freeze"
          ? Moon
          : Sparkles;
  return (
    <IconTile tone="primary" size="md">
      <Icon />
    </IconTile>
  );
}
