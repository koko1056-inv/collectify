import { WallpaperPreset } from "./wallpapers";

interface IsometricRoomFrameProps {
  wallpaper: WallpaperPreset | undefined;
  pattern?: React.ReactNode;
  /** Y% (from top of room) where the back wall meets the floor. 0-100. */
  horizonY?: number;
  /** X% inset on each side for the floor's back edge (perspective narrowness). */
  floorInset?: number;
}

/**
 * 2D scene to imply isometric corner room:
 * - Back wall fills the upper portion
 * - Floor extends forward as a trapezoid (narrower at top → wider at bottom)
 * - Side areas outside the floor trapezoid form the left/right "walls"
 * - Baseboard line + corner shading give depth
 *
 * Pure CSS / no Three.js. Items/furniture still position with normal 2D (%)
 * coordinates in the parent interactive layer.
 */
export function IsometricRoomFrame({
  wallpaper,
  pattern,
  horizonY = 54,
  floorInset = 14,
}: IsometricRoomFrameProps) {
  const wallGrad = wallpaper?.wallGradient || "linear-gradient(180deg,#f8fafc,#e9edf3)";
  const floorGrad = wallpaper?.floorGradient || "linear-gradient(180deg,#dee2ea,#c9d0dd)";
  const floorShadow = wallpaper?.floorShadow || "rgba(0,0,0,0.08)";
  const accent = wallpaper?.accentColor || "#64748b";

  return (
    <>
      {/* ====== Side walls (outside the floor trapezoid, on left/right) ====== */}
      {/* These are slightly darker to suggest the adjacent walls folding away. */}
      <div
        className="absolute inset-0"
        style={{
          background: wallGrad,
          filter: "brightness(0.92)",
        }}
      />

      {/* ====== Back wall (main, brightest face) ====== */}
      <div
        className="absolute"
        style={{
          top: 0,
          left: `${floorInset}%`,
          right: `${floorInset}%`,
          bottom: `${100 - horizonY}%`,
          background: wallGrad,
        }}
      />

      {/* Back wall pattern layer */}
      {pattern && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: 0,
            left: `${floorInset}%`,
            right: `${floorInset}%`,
            bottom: `${100 - horizonY}%`,
          }}
        >
          {pattern}
        </div>
      )}

      {/* Inner-corner shading (slight vignette at back-wall edges to fake the fold into side walls) */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0,
          left: `${floorInset}%`,
          width: "6%",
          height: `${horizonY}%`,
          background: `linear-gradient(to right, ${floorShadow}, transparent)`,
          opacity: 0.6,
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0,
          right: `${floorInset}%`,
          width: "6%",
          height: `${horizonY}%`,
          background: `linear-gradient(to left, ${floorShadow}, transparent)`,
          opacity: 0.6,
        }}
      />

      {/* ====== Floor (trapezoid using clip-path) ====== */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: floorGrad,
          clipPath: `polygon(${floorInset}% ${horizonY}%, ${100 - floorInset}% ${horizonY}%, 100% 100%, 0% 100%)`,
        }}
      />

      {/* Floor checkerboard pattern (depth cue) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          clipPath: `polygon(${floorInset}% ${horizonY}%, ${100 - floorInset}% ${horizonY}%, 100% 100%, 0% 100%)`,
          backgroundImage: `linear-gradient(45deg, ${accent} 25%, transparent 25%, transparent 75%, ${accent} 75%),
                            linear-gradient(45deg, ${accent} 25%, transparent 25%, transparent 75%, ${accent} 75%)`,
          backgroundPosition: "0 0, 18px 18px",
          backgroundSize: "36px 36px",
          opacity: 0.14,
        }}
      />

      {/* Distance fade on floor (further back = slightly darker/foggier, forward = brighter) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          clipPath: `polygon(${floorInset}% ${horizonY}%, ${100 - floorInset}% ${horizonY}%, 100% 100%, 0% 100%)`,
          background: `linear-gradient(180deg, ${floorShadow} 0%, transparent 30%, transparent 80%, rgba(255,255,255,0.1) 100%)`,
        }}
      />

      {/* Floor front-edge highlight (slightly brighter at the top of the floor to imply light) */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: `${horizonY}%`,
          left: `${floorInset}%`,
          right: `${floorInset}%`,
          height: "2%",
          background: `linear-gradient(180deg, rgba(255,255,255,0.3), transparent)`,
          clipPath: "inset(0)",
        }}
      />

      {/* Baseboard line at wall/floor junction */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: `${horizonY}%`,
          left: `${floorInset}%`,
          right: `${floorInset}%`,
          height: "0.4%",
          background: "rgba(0,0,0,0.25)",
        }}
      />

      {/* Shadow cast forward from the back wall onto the floor */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: `${horizonY}%`,
          left: `${floorInset}%`,
          right: `${floorInset}%`,
          height: "5%",
          background: `linear-gradient(180deg, ${floorShadow} 0%, transparent 100%)`,
        }}
      />

      {/* Corner lines going from the back wall out to the side walls (subtle diagonals) */}
      <svg
        className="absolute inset-0 pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <line
          x1={floorInset}
          y1="0"
          x2={floorInset}
          y2={horizonY}
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="0.15"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={100 - floorInset}
          y1="0"
          x2={100 - floorInset}
          y2={horizonY}
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="0.15"
          vectorEffect="non-scaling-stroke"
        />
        {/* Diagonal lines where back wall's bottom corner meets the side walls */}
        <line
          x1={floorInset}
          y1={horizonY}
          x2="0"
          y2="100"
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="0.15"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={100 - floorInset}
          y1={horizonY}
          x2="100"
          y2="100"
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="0.15"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </>
  );
}

export const DEFAULT_HORIZON_Y = 54;
export const DEFAULT_FLOOR_INSET = 14;
