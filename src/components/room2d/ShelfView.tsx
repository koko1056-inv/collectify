import { useRef, useState } from "react";
import { motion, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { RoomItem } from "@/hooks/useMyRoom";
import { RoomFurniture } from "@/components/room3d/FurnitureItem3D";
import { Item2D } from "./Item2D";
import { FurniturePiece2D } from "./FurniturePiece2D";
import { getFurnitureById, FurnitureStyle } from "./displayFurniturePresets";
import { getWallpaperById, DEFAULT_WALLPAPER_ID } from "./wallpapers";

const WALLPAPER_PREFIX = "wp:";
const THEME_PREFIX = "theme:"; // 後方互換のため、旧テーマIDも壁紙にマッピング

// 旧3Dテーマid → 新壁紙idのマッピング（データ移行用）
const THEME_TO_WALLPAPER: Record<string, string> = {
  sunny_room: "white_minimal",
  mint_cafe: "mint_cafe",
  cotton_candy: "cotton_candy",
  ocean_breeze: "ocean_breeze",
  sakura_night: "sakura_pink",
  cyber_neon: "cyber_neon",
  midnight_lounge: "midnight_lounge",
  sunset_shrine: "shrine_sunset",
  gaming_den: "gaming_den",
  enchanted_forest: "mint_cafe",
  crystal_palace: "lavender_dream",
  void_space: "midnight_lounge",
};

export interface ShelfViewProps {
  roomItems: RoomItem[];
  roomFurniture?: RoomFurniture[];
  backgroundColor?: string | null;
  backgroundImage?: string | null;
  roomTitle?: string;
  isEditing?: boolean;
  onItemClick?: (item: RoomItem) => void;
  onItemMove?: (itemId: string, posX: number, posY: number) => void;
  onFurnitureClick?: (furniture: RoomFurniture) => void;
  onFurnitureMove?: (furnitureId: string, posX: number, posY: number) => void;
  avatarUrl?: string | null;
  selectedItemId?: string | null;
  selectedFurnitureId?: string | null;
  onBackgroundClick?: () => void;
}

export function ShelfView(props: ShelfViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 壁紙の解決: "wp:ID" / "theme:ID" / "#HEX" / null
  const wallpaper = (() => {
    const bg = props.backgroundColor || "";
    if (bg.startsWith(WALLPAPER_PREFIX)) {
      return getWallpaperById(bg.slice(WALLPAPER_PREFIX.length));
    }
    if (bg.startsWith(THEME_PREFIX)) {
      const themeId = bg.slice(THEME_PREFIX.length);
      const wpId = THEME_TO_WALLPAPER[themeId] || DEFAULT_WALLPAPER_ID;
      return getWallpaperById(wpId);
    }
    return getWallpaperById(DEFAULT_WALLPAPER_ID);
  })();

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* === 背景: 壁 === */}
      <div
        className="absolute inset-0"
        style={{ background: wallpaper?.wallGradient || "#f5f5f5" }}
      />

      {/* 背景画像オーバーレイ（壁紙画像） */}
      {props.backgroundImage && (
        <img
          src={props.backgroundImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-90"
          crossOrigin="anonymous"
        />
      )}

      {/* パターン（桜・ドットなど） */}
      {wallpaper?.pattern && (
        <PatternOverlay pattern={wallpaper.pattern} color={wallpaper.patternColor || "#fff"} />
      )}

      {/* === 床 === */}
      <div
        className="absolute left-0 right-0 bottom-0 h-[22%]"
        style={{ background: wallpaper?.floorGradient || "#d8dde3" }}
      >
        <div
          className="absolute left-0 right-0 top-0 h-4 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, ${wallpaper?.floorShadow || "rgba(0,0,0,0.1)"} 0%, transparent 100%)`,
          }}
        />
      </div>

      {/* === インタラクティブ領域（ヘッダー/フッターを避けるための安全エリア） === */}
      {/* pt-16 で上部16%をヘッダー用に確保、pb-2 で下部2%確保 */}
      <div
        ref={containerRef}
        className="absolute inset-0 pt-[12%] pb-[2%]"
        onClick={() => props.onBackgroundClick?.()}
      >
        {/* === 家具レイヤー === */}
        {(props.roomFurniture || []).map((f) => {
          const preset = getFurnitureById(f.furniture_id);
          if (!preset) return null;
          return (
            <DraggableFurniture
              key={f.id}
              furniture={f}
              preset={preset}
              containerRef={containerRef}
              isEditing={props.isEditing}
              isSelected={props.selectedFurnitureId === f.id}
              onClick={() => props.onFurnitureClick?.(f)}
              onMove={(px, py) => props.onFurnitureMove?.(f.id, px, py)}
            />
          );
        })}

        {/* === アイテムレイヤー === */}
        {props.roomItems.map((item) => (
          <Item2D
            key={item.id}
            item={item}
            containerRef={containerRef}
            isEditing={props.isEditing}
            isSelected={props.selectedItemId === item.id}
            onClick={props.onItemClick}
            onMove={props.onItemMove}
          />
        ))}

        {/* === 編集モード時のグリッドガイド === */}
        {props.isEditing && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(to right, currentColor 1px, transparent 1px),
                linear-gradient(to bottom, currentColor 1px, transparent 1px)
              `,
              backgroundSize: "5% 5%",
              color: wallpaper?.accentColor || "#64748b",
            }}
          />
        )}
      </div>

      {/* === アバター（左下、インタラクティブ外） === */}
      {props.avatarUrl && (
        <div className="absolute bottom-[3%] left-[3%] pointer-events-none z-[60]">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-4 ring-white/80 shadow-xl"
            style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}
          >
            <img src={props.avatarUrl} alt="avatar" className="w-full h-full object-cover" crossOrigin="anonymous" />
          </div>
        </div>
      )}
    </div>
  );
}

// 画面端見切れ防止のセーフ範囲
const FURN_SAFE_MIN_X = 6;
const FURN_SAFE_MAX_X = 94;
const FURN_SAFE_MIN_Y = 15; // ヘッダー/壁上部を避ける
const FURN_SAFE_MAX_Y = 98; // 床ぎりぎりまでOK

function clamp2(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// === ドラッグ対応の家具ラッパー ===
function DraggableFurniture({
  furniture,
  preset,
  containerRef,
  isEditing,
  isSelected,
  onClick,
  onMove,
}: {
  furniture: RoomFurniture;
  preset: ReturnType<typeof getFurnitureById> & {};
  containerRef: React.RefObject<HTMLDivElement>;
  isEditing?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  onMove?: (posX: number, posY: number) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    if (!containerRef.current || !onMove) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newX = ((info.point.x - rect.left) / rect.width) * 100;
    const newY = ((info.point.y - rect.top) / rect.height) * 100;
    const clampedX = clamp2(newX, FURN_SAFE_MIN_X, FURN_SAFE_MAX_X);
    const clampedY = clamp2(newY, FURN_SAFE_MIN_Y, FURN_SAFE_MAX_Y);
    onMove(clampedX, clampedY);
  };

  const style = ((furniture as any).style as FurnitureStyle) || preset!.defaultStyle;

  return (
    // keyベースのリマウントで drag state をリセット → ジャンプ防止
    <motion.div
      key={`${furniture.id}-${furniture.position_x.toFixed(2)}-${furniture.position_y.toFixed(2)}`}
      drag={isEditing}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onClick?.();
      }}
      whileHover={isEditing && !isDragging ? { scale: 1.02 } : {}}
      whileDrag={{ scale: 1.04, zIndex: 100 }}
      className={cn(
        "absolute pointer-events-auto",
        isEditing && "cursor-grab active:cursor-grabbing"
      )}
      style={{
        left: `${furniture.position_x}%`,
        top: `${furniture.position_y}%`,
        // 底中央を(x,y)に配置
        translateX: "-50%",
        translateY: "-100%",
        width: `${preset!.widthVw * (furniture.scale || 1)}vw`,
        height: `${preset!.heightVw * (furniture.scale || 1)}vw`,
        maxWidth: "60vw",
        zIndex: isDragging ? 80 : isSelected ? 40 : 2,
      }}
    >
      <FurniturePiece2D
        preset={preset!}
        style={style}
        isSelected={isSelected}
        isEditing={isEditing}
        onClick={onClick}
      />
    </motion.div>
  );
}

// === パターンオーバーレイ ===
function PatternOverlay({
  pattern,
  color,
}: {
  pattern: "dots" | "stripes" | "sakura" | "stars" | "grid";
  color: string;
}) {
  if (pattern === "dots") {
    return (
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, ${color} 1px, transparent 1.5px)`,
          backgroundSize: "24px 24px",
        }}
      />
    );
  }
  if (pattern === "sakura") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => {
          const left = (i * 37) % 100;
          const top = (i * 53) % 100;
          const size = 6 + (i % 3) * 3;
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                background: color,
                borderRadius: "50% 10% 50% 10%",
                transform: `rotate(${i * 45}deg)`,
                opacity: 0.6,
              }}
            />
          );
        })}
      </div>
    );
  }
  if (pattern === "grid") {
    return (
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${color} 1px, transparent 1px),
            linear-gradient(to bottom, ${color} 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
    );
  }
  if (pattern === "stars") {
    return (
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-white opacity-60 animate-pulse"
            style={{
              left: `${(i * 41) % 100}%`,
              top: `${(i * 59) % 100}%`,
              fontSize: `${8 + (i % 4) * 3}px`,
              color,
              animationDelay: `${i * 0.2}s`,
            }}
          >
            ✦
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export { WALLPAPER_PREFIX };
