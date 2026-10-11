import { FURNITURE_DEFS, ROOM_ASSETS, ROOM_H, ROOM_W, goodsSize, type RoomSet } from "@/lib/oshiRoom";
import type { OshiColor } from "@/lib/cosmetics";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { ensureRoomTheme } from "./palette";
import { RoomShell } from "./art/RoomShell";
import { FurnitureArt } from "./art/Furniture";
import { GoodsFrame } from "./art/GoodsFrame";

const L = (x: number) => `${(x / ROOM_W) * 100}%`;
const T = (y: number) => `${(y / ROOM_H) * 100}%`;
const WP = (u: number) => `${(u / ROOM_W) * 100}%`;
const HP = (u: number) => `${(u / ROOM_H) * 100}%`;

/**
 * セットの見本（ショップの札と、鍵の付いた物を押したときのシート）。
 * そのセットの壁紙・床に、家具2つとフレームを決まった場所に置いた、小さな部屋の絵。動きは止めておく
 */
export function RoomSetPreview({ set, oshi = "pink", className }: { set: RoomSet; oshi?: OshiColor; className?: string }) {
  useEffect(ensureRoomTheme, []);
  const assets = ROOM_ASSETS.filter((a) => a.set === set);
  const wallpaper = assets.find((a) => a.kind === "wallpaper")?.key ?? "base.cream";
  const floor = assets.find((a) => a.kind === "floor")?.key ?? "base.wood";
  const frame = assets.find((a) => a.kind === "frame")?.key ?? "base.frame";
  const furniture = assets.filter((a) => a.kind === "furniture").map((a) => a.key);
  let standIndex = 0;
  const placed = furniture.map((key) => {
    const def = FURNITURE_DEFS[key];
    if (def?.layer === "wall") return { key, x: 280, y: 150 };
    const x = standIndex++ === 0 ? 76 : 290;
    return { key, x, y: 408 };
  });
  const g = goodsSize({ s: 1.25, frame });
  return (
    <div className={cn("oshi-room relative aspect-[360/420] w-full overflow-hidden", className)} aria-hidden="true">
      <RoomShell wallpaper={wallpaper} floor={floor} time="day" oshi={oshi} animate={false} />
      {placed.map((p) => {
        const def = FURNITURE_DEFS[p.key];
        if (!def) return null;
        return (
          <div key={p.key} className="absolute" style={{ left: L(p.x - def.w / 2), top: T(p.y - def.h), width: WP(def.w), height: HP(def.h) }}>
            <FurnitureArt k={p.key} oshi={oshi} animate={false} lit={false} />
          </div>
        );
      })}
      <div className="absolute" style={{ left: L(180 - g.w / 2), top: T(404 - g.h), width: WP(g.w), height: HP(g.h) }}>
        <GoodsFrame frame={frame} image={null} oshi={oshi} />
      </div>
    </div>
  );
}
