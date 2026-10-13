import { useEffect } from "react";
import { FRAME_DEFS, FURNITURE_DEFS, roomAsset } from "@/lib/oshiRoom";
import type { OshiColor } from "@/lib/cosmetics";
import { cn } from "@/lib/utils";
import { ensureRoomTheme } from "./palette";
import { RoomShell } from "./art/RoomShell";
import { FurnitureArt } from "./art/Furniture";
import { GoodsFrame } from "./art/GoodsFrame";

/**
 * 部屋のアイテム1つの小さな見本（動きは止める）。
 * レベルアップのお祝いの「〇〇が解放されました」、特典の一覧、ショップの単品の札で使う。
 * 家具・フレームは箱の中に収まる大きさで真ん中に、壁紙・床は部屋の絵を切り取って見せる
 */
export function AssetThumb({ k, oshi = "pink", className }: { k: string; oshi?: OshiColor; className?: string }) {
  useEffect(ensureRoomTheme, []);
  const meta = roomAsset(k);
  if (!meta) return null;
  if (meta.kind === "wallpaper" || meta.kind === "floor") {
    return (
      <span className={cn("oshi-room relative block overflow-hidden", className)} aria-hidden="true">
        <RoomShell
          wallpaper={meta.kind === "wallpaper" ? k : "base.cream"}
          floor={meta.kind === "floor" ? k : "base.wood"}
          time="day"
          oshi={oshi}
          animate={false}
        />
      </span>
    );
  }
  if (meta.kind === "furniture") {
    const def = FURNITURE_DEFS[k];
    const wide = def.w >= def.h;
    return (
      <span className={cn("oshi-room flex items-center justify-center", className)} aria-hidden="true">
        <span className={cn("block", wide ? "w-[86%]" : "h-[86%]")} style={{ aspectRatio: `${def.w} / ${def.h}` }}>
          <FurnitureArt k={k} oshi={oshi} animate={false} lit={false} />
        </span>
      </span>
    );
  }
  const def = FRAME_DEFS[k];
  return (
    <span className={cn("oshi-room flex items-center justify-center", className)} aria-hidden="true">
      <span className={cn("block", def.aspect < 1 ? "w-[78%]" : "h-[74%]")} style={{ aspectRatio: `1 / ${def.aspect}` }}>
        <GoodsFrame frame={k} image={null} oshi={oshi} imageWidth={120} />
      </span>
    </span>
  );
}
