import { Check, Package, Sparkles, Tag as TagIcon } from "lucide-react";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PointIcon } from "@/components/ui/point-icon";
import { IconTile } from "@/components/ui/icon-tile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMyUnlocks } from "@/hooks/useCosmetics";
import type { PointShopItem } from "@/hooks/usePointShop";
import { CoverArt } from "@/components/cosmetics/CoverArt";
import { AvatarFrame } from "@/components/cosmetics/AvatarFrame";
import {
  DEFAULT_SHARE_PALETTE,
  SHARE_TEMPLATE_PALETTES,
  cosmeticI18nId,
  isCoverKey,
  isFrameKey,
  isShareTemplateKey,
} from "@/lib/cosmetics";

/** 棚の並び。DB の category と同じ値 */
const CATEGORIES = ["cosmetic", "share", "capacity"] as const;

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
}: {
  items: PointShopItem[];
  currentPoints: number;
  pending: boolean;
  /** 交換の確認を開く。名前・説明は画面の言語に合わせたものに差し替えて渡す */
  onExchange: (item: PointShopItem) => void;
}) {
  const { t } = useLanguage();
  const { owned } = useMyUnlocks();

  const label = (item: PointShopItem) => {
    const key = item.unlock_key;
    if (!key) return { name: item.name, desc: item.description };
    const id = cosmeticI18nId(key);
    const kind = key.split(":")[0];
    return {
      name: t(`cosmetics.kind.${kind}`, { name: t(`cosmetics.items.${id}.name`) }),
      desc: t(`cosmetics.items.${id}.desc`),
    };
  };

  // 知らない棚の商品は「枠をふやす」に入れる（出し忘れを防ぐ）
  const shelfOf = (i: PointShopItem) =>
    (CATEGORIES as readonly string[]).includes(i.category) ? i.category : "capacity";
  const groups = CATEGORIES.map((c) => ({
    category: c,
    items: items.filter((i) => shelfOf(i) === c),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.category}>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{t(`cosmetics.shop.${g.category}`)}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.items.map((item) => {
              const isOwned = !!item.unlock_key && owned.has(item.unlock_key);
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
                    <Badge variant="secondary" className="gap-1 tabular-nums">
                      <PointIcon size={14} />
                      {item.points_cost}pt
                    </Badge>
                    {isOwned ? (
                      <Badge variant="outline" className="gap-1 text-success border-success/30">
                        <Check className="h-3 w-3" />
                        {t("cosmetics.shop.owned")}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!affordable || pending}
                        onClick={() => onExchange({ ...item, name, description: desc })}
                      >
                        {affordable
                          ? t("screens.pointShop.exchangeBuy")
                          : t("screens.pointShop.exchangeInsufficient")}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 小さな見本。カバーは柄、縁はアイコンの輪、シェアカードは紙と色の札、枠は印 */
function ItemPreview({ item }: { item: PointShopItem }) {
  const key = item.unlock_key;
  if (isCoverKey(key)) {
    return (
      <span className="relative block h-12 w-16 shrink-0 overflow-hidden rounded-lg ring-1 ring-inset ring-foreground/10">
        <CoverArt coverKey={key} />
      </span>
    );
  }
  if (isFrameKey(key)) {
    return (
      <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <AvatarFrame frameKey={key} thickness={3}>
          <span className="block h-8 w-8 rounded-full border-2 border-card bg-primary/15" />
        </AvatarFrame>
      </span>
    );
  }
  if (isShareTemplateKey(key)) {
    const p = SHARE_TEMPLATE_PALETTES[key] ?? DEFAULT_SHARE_PALETTE;
    return (
      <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <span
          aria-hidden="true"
          className="relative block h-10 w-8 overflow-hidden rounded ring-1 ring-inset ring-foreground/10 shadow-sm"
          style={{ backgroundColor: p.paper }}
        >
          <span className="absolute left-1 right-1 top-1.5 h-1 rounded-full" style={{ backgroundColor: p.ink, opacity: 0.8 }} />
          <span className="absolute left-1 top-3.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.accent }} />
          <span className="absolute bottom-1.5 left-1 right-1 h-1 rounded-full" style={{ backgroundColor: p.track }} />
        </span>
      </span>
    );
  }
  const Icon = item.item_type === "custom_tags" ? TagIcon : item.item_type === "collection_slots" ? Package : Sparkles;
  return (
    <IconTile tone="primary" size="md">
      <Icon />
    </IconTile>
  );
}
