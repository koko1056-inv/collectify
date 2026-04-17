import { motion } from "framer-motion";
import { DisplayFurniturePreset, FurnitureStyle } from "./displayFurniturePresets";
import { cn } from "@/lib/utils";

interface FurniturePiece2DProps {
  preset: DisplayFurniturePreset;
  style?: FurnitureStyle;
  isSelected?: boolean;
  isEditing?: boolean;
  scale?: number;
  onClick?: () => void;
}

// スタイルごとの色パレット
const STYLE_COLORS: Record<FurnitureStyle, { main: string; side: string; edge: string; shadow: string }> = {
  white: { main: "#ffffff", side: "#eef1f5", edge: "#d8dde3", shadow: "rgba(20,25,40,0.18)" },
  wood: { main: "#d4a574", side: "#b88a5e", edge: "#9e754d", shadow: "rgba(60,40,20,0.25)" },
  black: { main: "#2a2a30", side: "#1a1a1f", edge: "#0a0a0f", shadow: "rgba(0,0,0,0.4)" },
  acrylic: { main: "rgba(255,255,255,0.55)", side: "rgba(200,220,240,0.5)", edge: "rgba(120,160,200,0.7)", shadow: "rgba(100,140,180,0.3)" },
  gold: { main: "#fbbf24", side: "#d97706", edge: "#92400e", shadow: "rgba(140,80,0,0.35)" },
  pink: { main: "#fbcfe8", side: "#f9a8d4", edge: "#ec4899", shadow: "rgba(180,40,100,0.25)" },
};

export function FurniturePiece2D({
  preset,
  style = "white",
  isSelected,
  isEditing,
  scale = 1,
  onClick,
}: FurniturePiece2DProps) {
  const c = STYLE_COLORS[style];

  return (
    <motion.div
      onClick={(e) => {
        if (isEditing) {
          e.stopPropagation();
          onClick?.();
        }
      }}
      className={cn(
        "relative pointer-events-auto",
        isEditing && "cursor-pointer",
        isSelected && "ring-4 ring-purple-500 ring-offset-2 ring-offset-transparent rounded-sm"
      )}
      style={{
        width: "100%",
        height: "100%",
        transform: `scale(${scale})`,
        transformOrigin: "center bottom",
      }}
      animate={{
        filter: isSelected ? "drop-shadow(0 0 12px rgba(168,85,247,0.6))" : "none",
      }}
    >
      <FurnitureSvg preset={preset} colors={c} />
    </motion.div>
  );
}

function FurnitureSvg({
  preset,
  colors,
}: {
  preset: DisplayFurniturePreset;
  colors: { main: string; side: string; edge: string; shadow: string };
}) {
  switch (preset.id) {
    // === 棚 ===
    case "shelf_tier2":
      return <Shelf tiers={2} colors={colors} />;
    case "shelf_tier3":
      return <Shelf tiers={3} colors={colors} />;
    case "shelf_wide":
      return <Shelf tiers={2} wide colors={colors} />;
    case "shelf_floating":
      return <WallShelf colors={colors} />;

    // === 台座 ===
    case "stand_small":
      return <SmallPedestal colors={colors} />;
    case "stand_pedestal":
      return <RoundPedestal colors={colors} />;
    case "stand_riser":
      return <BoxRiser colors={colors} />;

    // === ボード ===
    case "board_acrylic":
      return <AcrylicBoard colors={colors} />;
    case "board_badge":
      return <BadgeBoard colors={colors} />;
    case "board_tapestry":
      return <Tapestry colors={colors} />;
    case "board_frame":
      return <PhotoFrame colors={colors} />;

    // === ケース ===
    case "case_glass":
      return <GlassCase colors={colors} />;
    case "case_box":
      return <DisplayBox colors={colors} />;

    // === 祭壇 ===
    case "altar_small":
      return <Altar tiers={2} colors={colors} />;
    case "altar_grand":
      return <Altar tiers={3} colors={colors} />;

    default:
      return <Shelf tiers={2} colors={colors} />;
  }
}

// === 個別コンポーネント ===

type Colors = { main: string; side: string; edge: string; shadow: string };

function Shelf({ tiers, wide, colors }: { tiers: number; wide?: boolean; colors: Colors }) {
  const tierH = 100 / (tiers + 0.1);
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      {/* 背板 */}
      <rect x="2" y="0" width="96" height="98" fill={colors.side} />
      {/* 各段 */}
      {Array.from({ length: tiers }).map((_, i) => {
        const y = (i + 0.1) * tierH;
        return (
          <g key={i}>
            {/* 棚板 */}
            <rect x="0" y={y} width="100" height="2.5" fill={colors.main} />
            <rect x="0" y={y + 2.5} width="100" height="0.8" fill={colors.edge} opacity={0.4} />
            {/* 棚板の影 */}
            <rect x="2" y={y + 3.3} width="96" height="2" fill={colors.shadow} opacity={0.35} />
          </g>
        );
      })}
      {/* サイドフレーム */}
      <rect x="0" y="0" width="3" height="100" fill={colors.main} />
      <rect x="97" y="0" width="3" height="100" fill={colors.main} />
      {/* 底 */}
      <rect x="0" y="97.5" width="100" height="2.5" fill={colors.edge} />
      <rect x="0" y="99.5" width="100" height="1.5" fill={colors.shadow} opacity={0.5} />
    </svg>
  );
}

function WallShelf({ colors }: { colors: Colors }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      <rect x="0" y="20" width="100" height="35" fill={colors.main} />
      <rect x="0" y="55" width="100" height="8" fill={colors.edge} opacity={0.4} />
      <rect x="2" y="63" width="96" height="10" fill={colors.shadow} opacity={0.35} />
    </svg>
  );
}

function SmallPedestal({ colors }: { colors: Colors }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      <ellipse cx="50" cy="85" rx="45" ry="10" fill={colors.shadow} opacity={0.4} />
      <rect x="15" y="30" width="70" height="55" fill={colors.main} />
      <rect x="15" y="30" width="70" height="8" fill={colors.edge} opacity={0.3} />
    </svg>
  );
}

function RoundPedestal({ colors }: { colors: Colors }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      <ellipse cx="50" cy="92" rx="45" ry="8" fill={colors.shadow} opacity={0.4} />
      <ellipse cx="50" cy="70" rx="40" ry="12" fill={colors.side} />
      <rect x="10" y="40" width="80" height="35" fill={colors.main} />
      <ellipse cx="50" cy="40" rx="40" ry="10" fill={colors.main} />
      <ellipse cx="50" cy="38" rx="40" ry="10" fill={colors.main} stroke={colors.edge} strokeWidth="0.5" opacity={0.9} />
    </svg>
  );
}

function BoxRiser({ colors }: { colors: Colors }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      <rect x="5" y="20" width="90" height="75" fill={colors.main} stroke={colors.edge} strokeWidth="1" />
      <rect x="5" y="20" width="90" height="4" fill={colors.edge} opacity={0.3} />
      <rect x="5" y="88" width="90" height="7" fill={colors.shadow} opacity={0.5} />
    </svg>
  );
}

function AcrylicBoard({ colors }: { colors: Colors }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      <rect x="0" y="30" width="100" height="40" fill={colors.main} />
      <rect x="0" y="70" width="100" height="12" fill={colors.edge} opacity={0.5} />
      <rect x="0" y="82" width="100" height="10" fill={colors.shadow} opacity={0.4} />
    </svg>
  );
}

function BadgeBoard({ colors }: { colors: Colors }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      {/* 外枠 */}
      <rect x="0" y="0" width="100" height="100" fill={colors.edge} />
      {/* コルク面 */}
      <rect x="4" y="4" width="92" height="92" fill={colors.main} />
      {/* コルク質感（ドット） */}
      {Array.from({ length: 15 }).map((_, i) => (
        <circle
          key={i}
          cx={10 + (i * 7) % 80}
          cy={10 + ((i * 11) % 80)}
          r="0.5"
          fill={colors.side}
          opacity={0.3}
        />
      ))}
    </svg>
  );
}

function Tapestry({ colors }: { colors: Colors }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      {/* 上の吊り棒 */}
      <rect x="0" y="0" width="100" height="4" fill={colors.edge} />
      <circle cx="5" cy="2" r="3" fill={colors.main} stroke={colors.edge} strokeWidth="0.5" />
      <circle cx="95" cy="2" r="3" fill={colors.main} stroke={colors.edge} strokeWidth="0.5" />
      {/* 布 */}
      <rect x="5" y="4" width="90" height="90" fill={colors.main} />
      {/* タッセル */}
      <rect x="5" y="94" width="90" height="3" fill={colors.edge} opacity={0.5} />
      {[...Array(6)].map((_, i) => (
        <line
          key={i}
          x1={10 + i * 15}
          y1={97}
          x2={10 + i * 15}
          y2={100}
          stroke={colors.edge}
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

function PhotoFrame({ colors }: { colors: Colors }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      <rect x="0" y="0" width="100" height="100" fill={colors.main} />
      <rect x="8" y="8" width="84" height="84" fill={colors.side} opacity={0.6} />
      <rect x="10" y="10" width="80" height="80" fill={colors.edge} opacity={0.3} />
    </svg>
  );
}

function GlassCase({ colors }: { colors: Colors }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      {/* 土台 */}
      <rect x="0" y="92" width="100" height="8" fill={colors.edge} />
      <rect x="0" y="96" width="100" height="4" fill={colors.shadow} opacity={0.5} />
      {/* ガラス本体 */}
      <rect x="3" y="2" width="94" height="90" fill="rgba(255,255,255,0.15)" stroke={colors.edge} strokeWidth="1" />
      {/* 内部棚（中段） */}
      <rect x="5" y="48" width="90" height="1.5" fill={colors.edge} opacity={0.5} />
      {/* 反射 */}
      <polygon points="3,2 35,2 15,40 3,40" fill="white" opacity={0.1} />
    </svg>
  );
}

function Altar({ tiers, colors }: { tiers: number; colors: Colors }) {
  // 階段状の祭壇
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      {/* 背後のアーチ（豪華感） */}
      <path
        d="M 20 50 Q 50 -5 80 50 L 80 98 L 20 98 Z"
        fill={colors.main}
        opacity={0.5}
      />
      {/* 階段状の段 */}
      {Array.from({ length: tiers }).map((_, i) => {
        const y = 100 - (i + 1) * (90 / tiers);
        const xPad = 5 + i * (35 / tiers);
        return (
          <g key={i}>
            <rect x={xPad} y={y} width={100 - xPad * 2} height={90 / tiers} fill={colors.main} />
            <rect x={xPad} y={y} width={100 - xPad * 2} height="2" fill="white" opacity={0.4} />
            <rect x={xPad} y={y + 90 / tiers - 2} width={100 - xPad * 2} height="2" fill={colors.edge} opacity={0.5} />
          </g>
        );
      })}
      {/* 中央の三角屋根風（一番上） */}
      <polygon
        points={`50,${100 - tiers * (90 / tiers) - 5} 30,${100 - tiers * (90 / tiers) + 5} 70,${100 - tiers * (90 / tiers) + 5}`}
        fill={colors.edge}
      />
    </svg>
  );
}

function DisplayBox({ colors }: { colors: Colors }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      {/* 外箱 */}
      <rect x="0" y="20" width="100" height="78" fill={colors.main} />
      {/* 中央の仕切り */}
      <rect x="49" y="25" width="2" height="70" fill={colors.edge} opacity={0.4} />
      {/* 内側の影 */}
      <rect x="3" y="23" width="94" height="3" fill={colors.shadow} opacity={0.3} />
      {/* 前面の縁 */}
      <rect x="0" y="95" width="100" height="3" fill={colors.edge} />
    </svg>
  );
}
