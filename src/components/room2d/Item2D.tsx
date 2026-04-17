import { motion, PanInfo } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { RoomItem } from "@/hooks/useMyRoom";
import { getDisplayStyle, DisplayStyle } from "../room3d/displayStyles";

interface Item2DProps {
  item: RoomItem;
  containerRef: React.RefObject<HTMLDivElement>;
  isEditing?: boolean;
  isSelected?: boolean;
  onClick?: (item: RoomItem) => void;
  onMove?: (itemId: string, posX: number, posY: number) => void;
}

// 画面端での見切れを防ぐためのセーフパディング（画面%）
const SAFE_MIN_X = 4;
const SAFE_MAX_X = 96;
// 上は画面上部のヘッダーを避ける、下は床+アバターを避ける
const SAFE_MIN_Y = 8;
const SAFE_MAX_Y = 92;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function Item2D({
  item,
  containerRef,
  isEditing,
  isSelected,
  onClick,
  onMove,
}: Item2DProps) {
  const [isDragging, setIsDragging] = useState(false);

  const imageUrl = item.custom_image_url || item.item_data?.image;
  const style = getDisplayStyle(item.display_style || "poster");
  const sizeVw = (item.width / 100) * 8;

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    if (!containerRef.current || !onMove) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newX = ((info.point.x - rect.left) / rect.width) * 100;
    const newY = ((info.point.y - rect.top) / rect.height) * 100;
    const clampedX = clamp(newX, SAFE_MIN_X, SAFE_MAX_X);
    const clampedY = clamp(newY, SAFE_MIN_Y, SAFE_MAX_Y);
    onMove(item.id, clampedX, clampedY);
  };

  if (!imageUrl) return null;

  return (
    // keyによってposition変更後に確実にリマウントし、framer-motionのdrag stateをリセット
    <motion.div
      key={`${item.id}-${item.position_x.toFixed(2)}-${item.position_y.toFixed(2)}`}
      drag={isEditing}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onClick?.(item);
      }}
      whileHover={isEditing && !isDragging ? { scale: 1.05 } : {}}
      whileDrag={{ scale: 1.1, zIndex: 100 }}
      // ふわふわ浮遊（ドラッグ中は停止）
      animate={isDragging ? undefined : { y: [0, -2, 0] }}
      transition={
        isDragging
          ? undefined
          : { y: { duration: 3 + (item.position_x % 2), repeat: Infinity, ease: "easeInOut" } }
      }
      className={cn(
        "absolute pointer-events-auto",
        isEditing && "cursor-grab active:cursor-grabbing",
        isSelected && "z-40"
      )}
      style={{
        left: `${item.position_x}%`,
        top: `${item.position_y}%`,
        width: `${sizeVw}vw`,
        maxWidth: "200px",
        minWidth: "50px",
        zIndex: isDragging ? 100 : isSelected ? 50 : item.z_index || 1,
        // -50%, -50% でアイテムの中心を (position_x, position_y) に配置
        translateX: "-50%",
        translateY: "-50%",
      }}
    >
      <ItemDisplay
        imageUrl={imageUrl}
        style={style?.id || "poster"}
        isSelected={isSelected}
      />
    </motion.div>
  );
}

function ItemDisplay({
  imageUrl,
  style,
  isSelected,
}: {
  imageUrl: string;
  style: DisplayStyle;
  isSelected?: boolean;
}) {
  const selectionRing = isSelected
    ? "ring-4 ring-purple-500 ring-offset-2 ring-offset-transparent"
    : "";

  switch (style) {
    case "poster":
      return (
        <div
          className={cn(
            "w-full aspect-[3/4] bg-black/10 overflow-hidden shadow-xl rounded-sm",
            selectionRing
          )}
          style={{ filter: "drop-shadow(0 8px 8px rgba(0,0,0,0.25))" }}
        >
          <img src={imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
        </div>
      );

    case "framed":
      return (
        <div
          className={cn("w-full aspect-[3/4] overflow-hidden rounded-md", selectionRing)}
          style={{
            background: "linear-gradient(135deg, #b8916a 0%, #8b6a4d 100%)",
            padding: "8%",
            boxShadow:
              "0 8px 16px rgba(80,40,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3)",
          }}
        >
          <div
            className="w-full h-full overflow-hidden"
            style={{ boxShadow: "inset 0 0 8px rgba(0,0,0,0.4)" }}
          >
            <img src={imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
          </div>
        </div>
      );

    case "acrylic_stand":
      return (
        <div className={cn("relative w-full", selectionRing)}>
          <div
            className="w-full aspect-[3/5] relative overflow-hidden"
            style={{
              clipPath: "polygon(50% 0%, 95% 15%, 95% 85%, 50% 100%, 5% 85%, 5% 15%)",
              filter: "drop-shadow(0 4px 8px rgba(0,100,200,0.3))",
            }}
          >
            <img src={imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.15) 100%)",
              }}
            />
          </div>
          <div
            className="w-1/2 h-2 mx-auto rounded-md -mt-0.5"
            style={{
              background:
                "linear-gradient(180deg, rgba(200,220,240,0.7), rgba(120,160,200,0.8))",
              boxShadow: "0 2px 4px rgba(80,120,160,0.3)",
            }}
          />
        </div>
      );

    case "figure":
      return (
        <div className={cn("relative w-full", selectionRing)}>
          <div
            className="w-full aspect-[3/5] overflow-hidden rounded-t-lg"
            style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.35))" }}
          >
            <img src={imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
          </div>
          <div
            className="w-3/4 h-[10%] mx-auto -mt-1 rounded-md relative"
            style={{
              background: "linear-gradient(180deg, #2a2a3a 0%, #1a1a25 100%)",
              boxShadow:
                "0 4px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            <div
              className="absolute inset-x-0 top-[30%] h-px"
              style={{ background: "rgba(251,191,36,0.4)" }}
            />
          </div>
        </div>
      );

    case "plush":
      return (
        <div
          className={cn(
            "w-full aspect-square overflow-hidden rounded-[40%]",
            selectionRing
          )}
          style={{
            background: "radial-gradient(circle, #fce7f3 0%, #f9a8d4 100%)",
            padding: "6%",
            filter: "drop-shadow(0 8px 12px rgba(220,100,160,0.3))",
          }}
        >
          <div className="w-full h-full rounded-[35%] overflow-hidden">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
          </div>
        </div>
      );

    case "trophy":
      return (
        <div className={cn("relative w-full", selectionRing)}>
          <div
            className="absolute inset-0 pointer-events-none -m-2"
            style={{
              background: "radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)",
            }}
          />
          <div
            className="relative w-full aspect-[3/5] overflow-hidden rounded-t-lg"
            style={{
              filter:
                "drop-shadow(0 0 6px rgba(251,191,36,0.5)) drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
            }}
          >
            <img src={imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
          </div>
          <div
            className="w-2/3 h-[12%] mx-auto -mt-1 rounded"
            style={{
              background: "linear-gradient(180deg, #fbbf24 0%, #b45309 100%)",
              boxShadow:
                "0 4px 8px rgba(180,100,0,0.5), inset 0 1px 0 rgba(255,230,150,0.5)",
            }}
          />
        </div>
      );

    default:
      return (
        <div className={cn("w-full aspect-square overflow-hidden rounded-md", selectionRing)}>
          <img src={imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
        </div>
      );
  }
}
