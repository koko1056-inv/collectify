import { useId } from "react";
import { FRAME_DEFS, type FrameDef } from "@/lib/oshiRoom";
import type { OshiColor } from "@/lib/cosmetics";
import { fallbackToOriginal, getOptimizedImageUrl } from "@/utils/optimized-image";
import { INK, LEVEL_GLOW, PAINT, oshiPaint } from "../palette";
import { heartPath, petalPath, sparklePath } from "./shapes";

interface GoodsFrameProps {
  frame: string;
  /** グッズの写真（そのまま。切り抜かない） */
  image: string | null;
  oshi: OshiColor;
  /** なかよし度のレベル。高いほど、フレームのまわりがほんのり光る */
  level?: number;
  /** 写真の横幅の目安（px）。サムネの大きさを選ぶのに使う */
  imageWidth?: number;
}

/**
 * グッズを入れるフレーム（額縁・アクスタ台・缶バッジ・写真立て など）。
 * 写真は HTML の img で、フレームの「窓」（FRAME_DEFS.window）にぴったり入れる。
 * フレームの絵は、写真の後ろ（台・脚）と前（縁・つや）の2枚の SVG で挟む。
 */
export function GoodsFrame({ frame, image, oshi, level = 1, imageWidth = 240 }: GoodsFrameProps) {
  const def = FRAME_DEFS[frame] ?? FRAME_DEFS["base.frame"];
  const id = useId().replace(/:/g, "");
  const H = 100 * def.aspect;
  const glow = level >= 10 ? LEVEL_GLOW.rainbow : level >= 7 ? LEVEL_GLOW.gold : level >= 5 ? LEVEL_GLOW.silver : level >= 3 ? LEVEL_GLOW.bronze : null;
  const win = def.window;
  const shapeStyle: React.CSSProperties =
    def.shape === "circle"
      ? { borderRadius: "50%" }
      : def.shape === "round"
        ? { borderRadius: "10%" }
        : def.shape === "heart"
          ? { clipPath: `url(#${id}-heart)` }
          : { borderRadius: "2%" };

  return (
    <div className="relative h-full w-full" style={glow ? { filter: `drop-shadow(0 0 4px ${glow})` } : undefined}>
      {def.shape === "heart" && (
        <svg width="0" height="0" className="absolute" aria-hidden="true">
          <clipPath id={`${id}-heart`} clipPathUnits="objectBoundingBox">
            {/* heartPath(0.5, 0.5, 0.5) は縦 0〜0.9。窓いっぱいにするため縦だけ少し伸ばす */}
            <path d={heartPath(0.5, 0.5, 0.5)} transform="scale(1 1.1)" />
          </clipPath>
        </svg>
      )}
      <svg viewBox={`0 0 100 ${H}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <FrameBack k={frame} H={H} def={def} oshi={oshi} />
      </svg>
      <div
        className="absolute overflow-hidden bg-muted"
        style={{ left: `${win.x * 100}%`, top: `${win.y * 100}%`, width: `${win.w * 100}%`, height: `${win.h * 100}%`, ...shapeStyle }}
      >
        {image && (
          <img
            src={getOptimizedImageUrl(image, { width: imageWidth })}
            onError={fallbackToOriginal(image)}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            className="pointer-events-none h-full w-full select-none object-cover"
          />
        )}
      </div>
      <svg viewBox={`0 0 100 ${H}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <FrameFront k={frame} H={H} def={def} oshi={oshi} id={id} />
      </svg>
    </div>
  );
}

const S = { stroke: INK, strokeWidth: 2.2, strokeLinejoin: "round" as const };

/** 外側の四角から窓をくり抜いた形（evenodd で穴にする） */
function ringRect(x: number, y: number, w: number, h: number, r: number, hx: number, hy: number, hw: number, hh: number, hr: number): string {
  const rr = (X: number, Y: number, W: number, H: number, R: number) =>
    `M${X + R} ${Y}h${W - 2 * R}a${R} ${R} 0 0 1 ${R} ${R}v${H - 2 * R}a${R} ${R} 0 0 1 -${R} ${R}h-${W - 2 * R}a${R} ${R} 0 0 1 -${R} -${R}v-${H - 2 * R}a${R} ${R} 0 0 1 ${R} -${R}Z`;
  return rr(x, y, w, h, r) + rr(hx, hy, hw, hh, hr);
}

function winRect(def: FrameDef, H: number) {
  return { x: def.window.x * 100, y: def.window.y * H, w: def.window.w * 100, h: def.window.h * H };
}

function FrameBack({ k, H, def, oshi }: { k: string; H: number; def: FrameDef; oshi: OshiColor }) {
  const w = winRect(def, H);
  switch (k) {
    case "base.acrylic":
      return (
        <g>
          {/* 台座 */}
          <path d={`M16 ${H - 24} h68 l10 20 q0 4 -4 4 h-80 q-4 0 -4 -4Z`} fill={PAINT.frame.acrylic.base} {...S} />
          <rect x="40" y={H - 30} width="20" height="8" rx="2" fill={PAINT.frame.acrylic.baseShade} {...S} strokeWidth={1.6} />
          {/* 透明の板 */}
          <rect x="2" y="1" width="96" height={H - 30} rx="12" fill={PAINT.frame.acrylic.edge} {...S} />
        </g>
      );
    case "base.photo":
      // 後ろの脚
      return <path d={`M50 ${H * 0.3} L76 ${H + 2}`} stroke={PAINT.frame.photo.leg} strokeWidth="6" strokeLinecap="round" />;
    case "base.badge":
      return <circle cx="50" cy="50" r="49" fill={PAINT.frame.badge.rimShade} />;
    case "natsu.uchiwa": {
      const U = PAINT.frame.uchiwa;
      return (
        <g>
          <rect x="44" y={w.y + w.h - 4} width="12" height={H - w.y - w.h + 2} rx="5" fill={U.handle} {...S} />
          <path d={`M47 ${w.y + w.h + 10} v${H - w.y - w.h - 18}`} stroke={U.handleDeep} strokeWidth="2" />
          <circle cx="50" cy={w.y + w.h / 2} r={w.w / 2 + 7} fill={U.face} {...S} />
        </g>
      );
    }
    case "xmas.wreath":
      return <circle cx="50" cy={w.y + w.h / 2} r={w.w / 2 + 2} fill={PAINT.white} />;
    case "yumekawa.heart":
      return <path d={heartPath(50, H / 2 + 2, 52)} fill={PAINT.frame.heart.rim} {...S} />;
    default:
      return null;
  }
}

function FrameFront({ k, H, def, oshi, id }: { k: string; H: number; def: FrameDef; oshi: OshiColor; id: string }) {
  const w = winRect(def, H);
  const F = PAINT.frame;
  switch (k) {
    case "base.frame":
      return (
        <g>
          <path d={`M42 -6 L50 -14 L58 -6`} fill="none" stroke={INK} strokeWidth="1.6" />
          <circle cx="50" cy="-14" r="2.4" fill={F.wood.inner} stroke={INK} strokeWidth="1.2" />
          <path d={ringRect(0, 0, 100, H, 6, w.x, w.y, w.w, w.h, 2)} fillRule="evenodd" fill={F.wood.face} {...S} />
          <rect x={w.x - 3} y={w.y - 3} width={w.w + 6} height={w.h + 6} rx="3" fill="none" stroke={F.wood.inner} strokeWidth="3" />
          <path d={`M6 6 h${100 - 12}`} stroke={F.wood.shine} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      );
    case "base.acrylic":
      return (
        <g>
          <rect x={w.x} y={w.y} width={w.w} height={w.h} rx={w.w * 0.1} fill="none" stroke={INK} strokeWidth="1.4" opacity="0.6" />
          <path d={`M${w.x + 8} ${w.y + w.h * 0.62} L${w.x + w.w * 0.62} ${w.y + 6} L${w.x + w.w * 0.78} ${w.y + 6} L${w.x + 8} ${w.y + w.h * 0.8}Z`} fill={F.acrylic.rim} opacity="0.28" />
          <rect x="2" y="1" width="96" height={H - 30} rx="12" fill="none" stroke={F.acrylic.rim} strokeWidth="2" opacity="0.9" />
        </g>
      );
    case "base.badge":
      return (
        <g>
          <circle cx="50" cy="50" r="46" fill="none" stroke={F.badge.rim} strokeWidth="8" />
          <circle cx="50" cy="50" r="49" fill="none" {...S} />
          <path d="M22 30 A34 34 0 0 1 44 14" fill="none" stroke={F.badge.shine} strokeWidth="6" strokeLinecap="round" />
        </g>
      );
    case "base.photo":
      return (
        <g>
          <path d={ringRect(0, 0, 100, H, 4, w.x, w.y, w.w, w.h, 1)} fillRule="evenodd" fill={F.photo.face} {...S} />
          <rect x={w.x} y={w.y} width={w.w} height={w.h} fill="none" stroke={F.photo.shade} strokeWidth="1.6" />
          <path d={heartPath(50, H - 9, 3.2)} fill={F.photo.shade} />
        </g>
      );
    case "oshi.ribbon": {
      const o = oshiPaint(oshi);
      return (
        <g>
          <path d={ringRect(2, 18, 96, H - 18, 12, w.x, w.y, w.w, w.h, w.w * 0.1)} fillRule="evenodd" fill={o.base} {...S} />
          <path d={`M10 26 h80`} stroke={o.light} strokeWidth="2.4" strokeLinecap="round" />
          {/* リボン */}
          <path d="M50 18 C36 2 18 4 24 20 C28 30 42 26 50 20Z" fill={o.mid} {...S} />
          <path d="M50 18 C64 2 82 4 76 20 C72 30 58 26 50 20Z" fill={o.mid} {...S} />
          <path d="M46 20 l-8 18 l6 -2 l4 6Z M54 20 l8 18 l-6 -2 l-4 6Z" fill={o.deep} {...S} strokeWidth={1.6} />
          <rect x="44" y="12" width="12" height="12" rx="4" fill={o.base} {...S} />
        </g>
      );
    }
    case "sakura.frame":
      return (
        <g>
          <path d={ringRect(0, 0, 100, H, 14, w.x, w.y, w.w, w.h, w.w * 0.1)} fillRule="evenodd" fill={F.sakura.face} {...S} />
          {[[10, 10, 0], [90, H - 10, 20], [86, 12, 40], [14, H - 14, 60]].map(([x, y, r], i) => (
            <g key={i}>
              {[0, 72, 144, 216, 288].map((d) => (
                <path key={d} d={petalPath(x, y, i < 2 ? 10 : 6, d + r)} fill={i % 2 ? F.sakura.petalDeep : F.sakura.petal} stroke={INK} strokeWidth="1" />
              ))}
              <circle cx={x} cy={y} r="2" fill={PAINT.white} />
            </g>
          ))}
        </g>
      );
    case "natsu.uchiwa": {
      const U = PAINT.frame.uchiwa;
      const cy = w.y + w.h / 2;
      return (
        <g>
          <circle cx="50" cy={cy} r={w.w / 2 + 4} fill="none" stroke={U.rim} strokeWidth="5" />
          <circle cx="50" cy={cy} r={w.w / 2 + 7} fill="none" stroke={INK} strokeWidth="2" />
          <path d={`M${50 - w.w / 2} ${cy + w.h * 0.3} q8 -6 16 0 t16 0 t16 0 t16 0 t16 0`} fill="none" stroke={U.wave} strokeWidth="3" opacity="0.85" clipPath={`url(#${id}-uc)`} />
          <defs>
            <clipPath id={`${id}-uc`}>
              <circle cx="50" cy={cy} r={w.w / 2} />
            </clipPath>
          </defs>
        </g>
      );
    }
    case "halloween.frame": {
      const Hf = F.halloween;
      return (
        <g>
          <path d={ringRect(0, 0, 100, H, 4, w.x, w.y, w.w, w.h, 2)} fillRule="evenodd" fill={Hf.face} {...S} />
          <rect x={w.x - 3} y={w.y - 3} width={w.w + 6} height={w.h + 6} rx="2" fill="none" stroke={Hf.inner} strokeWidth="2.4" />
          {/* くものす（左上） */}
          <g stroke={Hf.web} strokeWidth="1" fill="none" opacity="0.9">
            <path d="M0 0 L26 0 M0 0 L0 26 M0 0 L22 16 M0 0 L16 22" />
            <path d="M8 0 Q8 8 0 8 M16 0 Q15 14 0 16 M24 0 Q22 22 0 24" />
          </g>
          <path d="M70 -2 q4 -6 8 0 q2 -4 4 -1 q2 -3 4 1 q4 -6 8 0 q-4 0 -6 4 q-2 -2 -6 -2 q-4 0 -6 2 q-2 -4 -6 -4Z" fill={Hf.face} stroke={Hf.inner} strokeWidth="0.8" />
        </g>
      );
    }
    case "xmas.wreath": {
      const X = F.wreath;
      const cx = 50;
      const cy = w.y + w.h / 2;
      const R = w.w / 2 + 7;
      return (
        <g>
          {Array.from({ length: 18 }, (_, i) => {
            const t = (i / 18) * Math.PI * 2;
            return <ellipse key={i} cx={cx + Math.cos(t) * R} cy={cy + Math.sin(t) * R} rx="8" ry="5" transform={`rotate(${(t * 180) / Math.PI + 90} ${cx + Math.cos(t) * R} ${cy + Math.sin(t) * R})`} fill={i % 2 ? X.leaf : X.leafDeep} stroke={INK} strokeWidth="1" />;
          })}
          {[30, 100, 160, 220, 300].map((d) => {
            const t = (d * Math.PI) / 180;
            return <circle key={d} cx={cx + Math.cos(t) * R} cy={cy + Math.sin(t) * R} r="3" fill={X.berry} stroke={INK} strokeWidth="0.8" />;
          })}
          <path d={`M${cx} ${cy + R} c-14 -10 -20 6 -14 10 c6 4 10 -4 14 -10Z M${cx} ${cy + R} c14 -10 20 6 14 10 c-6 4 -10 -4 -14 -10Z`} fill={X.bow} stroke={INK} strokeWidth="1.4" />
          <path d={`M${cx - 2} ${cy + R + 2} l-8 16 M${cx + 2} ${cy + R + 2} l8 16`} stroke={X.bowDeep} strokeWidth="4" strokeLinecap="round" />
          <circle cx={cx} cy={cy + R} r="4" fill={X.bowDeep} stroke={INK} strokeWidth="1.2" />
        </g>
      );
    }
    case "yumekawa.heart": {
      const Hh = F.heart;
      return (
        <g>
          <path d={heartPath(50, H / 2 + 2, 52)} fill="none" stroke={Hh.face} strokeWidth="7" />
          <path d={heartPath(50, H / 2 + 2, 55)} fill="none" {...S} />
          <path d={sparklePath(88, 10, 8)} fill={Hh.shine} stroke={INK} strokeWidth="1" />
          <path d={sparklePath(12, 70, 5)} fill={Hh.shine} stroke={INK} strokeWidth="1" />
        </g>
      );
    }
    case "showcase.gold": {
      const G = F.gold;
      return (
        <g>
          <path d={ringRect(0, 0, 100, H, 3, w.x, w.y, w.w, w.h, 1)} fillRule="evenodd" fill={G.face} {...S} />
          <rect x={w.x - 4} y={w.y - 4} width={w.w + 8} height={w.h + 8} fill="none" stroke={G.deep} strokeWidth="3" />
          <rect x="5" y="5" width="90" height={H - 10} fill="none" stroke={G.light} strokeWidth="1.6" />
          {[[0, 0], [100, 0], [0, H], [100, H]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="8" fill={G.face} stroke={INK} strokeWidth="1.8" />
          ))}
          {[[0, 0], [100, 0], [0, H], [100, H]].map(([x, y], i) => (
            <path key={i} d={sparklePath(x, y, 5)} fill={G.light} />
          ))}
          <path d={sparklePath(50, 4, 5)} fill={G.light} stroke={INK} strokeWidth="0.8" />
        </g>
      );
    }
    default:
      return null;
  }
}
