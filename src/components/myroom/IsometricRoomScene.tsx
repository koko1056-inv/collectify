import { useMemo } from "react";
import { motion } from "framer-motion";
import { RoomItem } from "@/hooks/useMyRoom";
import { ROOM_SLOTS, getSlotById } from "./roomSlots";
import { getItemSlotId } from "./autoPlace";
import { RoomTheme, getTimeFilter, TimeOfDay } from "./roomThemes";

interface IsometricRoomSceneProps {
  items: RoomItem[];
  theme: RoomTheme;
  timeOfDay: TimeOfDay;
  avatarUrl?: string | null;
  onItemClick?: (item: RoomItem) => void;
  className?: string;
}

export function IsometricRoomScene({
  items,
  theme,
  timeOfDay,
  avatarUrl,
  onItemClick,
  className = "",
}: IsometricRoomSceneProps) {
  const time = getTimeFilter(timeOfDay);

  // アイテム → スロット割り当て (重複は後勝ち)
  const placed = useMemo(() => {
    const map = new Map<number, RoomItem>();
    for (const item of items) {
      const slotId = getItemSlotId(item);
      map.set(slotId, item);
    }
    return Array.from(map.entries())
      .map(([slotId, item]) => {
        const slot = getSlotById(slotId);
        if (!slot) return null;
        return { item, slot };
      })
      .filter((x): x is { item: RoomItem; slot: typeof ROOM_SLOTS[0] } => x !== null)
      .sort((a, b) => a.slot.z - b.slot.z);
  }, [items]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{ background: theme.ambient }}>
      <svg
        viewBox="0 0 800 600"
        className="w-full h-full block"
        style={{ filter: time.filter, transition: "filter 1.5s ease" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 後ろ壁 */}
        <polygon points="100,80 700,80 700,360 100,360" fill={theme.wall} />
        {/* 左壁 (アイソメ風の傾き) */}
        <polygon points="0,40 100,80 100,400 0,520" fill={theme.wallSide} />
        {/* 床 */}
        <polygon points="100,360 700,360 800,520 0,520" fill={theme.floor} />

        {/* 床の市松タイル */}
        <g opacity={0.4}>
          {Array.from({ length: 8 }).map((_, row) =>
            Array.from({ length: 10 }).map((_, col) => {
              if ((row + col) % 2 !== 0) return null;
              const yTop = 360 + row * 20;
              const yBot = yTop + 20;
              const skew = (yTop - 360) / (520 - 360);
              const xLeftTop = 100 - 100 * skew + col * (60 + skew * 15);
              const xRightTop = xLeftTop + (60 + skew * 15);
              const skewBot = (yBot - 360) / (520 - 360);
              const xLeftBot = 100 - 100 * skewBot + col * (60 + skewBot * 15);
              const xRightBot = xLeftBot + (60 + skewBot * 15);
              return (
                <polygon
                  key={`${row}-${col}`}
                  points={`${xLeftTop},${yTop} ${xRightTop},${yTop} ${xRightBot},${yBot} ${xLeftBot},${yBot}`}
                  fill={theme.floorAlt}
                />
              );
            }),
          )}
        </g>

        {/* 棚 (3段) - 後ろ壁につく木の棚 */}
        <g>
          {[145, 200, 255, 310].map((y) => (
            <g key={y}>
              <rect x={170} y={y} width={310} height={8} fill={theme.shelf} />
              <rect x={170} y={y + 8} width={310} height={3} fill={theme.shelfDark} opacity={0.6} />
            </g>
          ))}
          {/* 棚の左右の支柱 */}
          <rect x={170} y={145} width={6} height={170} fill={theme.shelfDark} />
          <rect x={474} y={145} width={6} height={170} fill={theme.shelfDark} />
        </g>

        {/* デスク (右奥) */}
        <g>
          <polygon points="555,310 660,310 685,335 580,335" fill={theme.shelf} />
          <rect x={580} y={335} width={105} height={75} fill={theme.shelfDark} opacity={0.85} />
          <rect x={580} y={335} width={105} height={4} fill={theme.shelfDark} />
        </g>

        {/* 左壁の小さな額のかけ跡 (装飾) */}
        <circle cx={80} cy={130} r={3} fill={theme.shelfDark} opacity={0.3} />
        <circle cx={80} cy={300} r={3} fill={theme.shelfDark} opacity={0.3} />

        {/* アバター (床の中央手前) */}
        {avatarUrl && (
          <g>
            <ellipse cx={400} cy={510} rx={45} ry={8} fill="#000" opacity={0.2} />
            <foreignObject x={355} y={400} width={90} height={110}>
              <div className="w-full h-full flex items-end justify-center">
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="w-20 h-20 rounded-full object-cover border-4 border-background shadow-xl"
                  style={{ background: theme.ambient }}
                />
              </div>
            </foreignObject>
          </g>
        )}

        {/* アイテム描画 */}
        {placed.map(({ item, slot }, idx) => {
          const img =
            item.item_data?.image ||
            item.custom_image_url ||
            "";
          if (!img) return null;
          return (
            <g key={item.id} style={{ cursor: onItemClick ? "pointer" : "default" }}>
              {/* 影 */}
              <ellipse
                cx={slot.x}
                cy={slot.y + slot.h / 2 + 4}
                rx={slot.w / 2.5}
                ry={4}
                fill="#000"
                opacity={0.18}
              />
              <foreignObject
                x={slot.x - slot.w / 2}
                y={slot.y - slot.h / 2}
                width={slot.w}
                height={slot.h}
                onClick={() => onItemClick?.(item)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.6, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, type: "spring", stiffness: 200, damping: 18 }}
                  whileHover={{ scale: 1.08, y: -3 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <img
                    src={img}
                    alt={item.item_data?.title || ""}
                    className="max-w-full max-h-full object-contain drop-shadow-md"
                    draggable={false}
                  />
                </motion.div>
              </foreignObject>
            </g>
          );
        })}
      </svg>

      {/* 時間帯のオーバーレイ */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-soft-light"
        style={{ background: time.overlay, opacity: time.overlayOpacity, transition: "opacity 1.5s ease" }}
      />

      {/* 夜のキラキラ */}
      {timeOfDay === "night" && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-white"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 17) % 40}%`,
              }}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.4, 0.8] }}
              transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
