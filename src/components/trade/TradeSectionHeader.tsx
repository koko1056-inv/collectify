import type { LucideIcon } from "lucide-react";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";

/**
 * 交換タブの各枠の見出し。
 *
 * 以前は枠ごとにハート・キラキラ・プレゼント・重なりのアイコンを
 * それぞれ別の色（ピンク・琥珀・水色）で付けていて、ちぐはぐで安っぽく見えていた。
 * 見出しのアイコンは、落ち着いた色の IconTile（sm）1種類に揃える。
 * 色で目立たせるのは、押せるボタンと「両想い」などの状態だけにする。
 */
export function TradeSectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <CardHeader className="space-y-1 pb-3">
      <CardTitle className="flex items-center gap-2.5 text-base font-semibold leading-snug tracking-normal">
        <IconTile size="sm" tone="muted">
          <Icon />
        </IconTile>
        <span className="min-w-0">{title}</span>
      </CardTitle>
      {description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
    </CardHeader>
  );
}
