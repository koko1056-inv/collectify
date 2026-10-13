import { useId } from "react";
import { FRAME_DEFS, type FrameDef } from "@/lib/oshiRoom";
import type { OshiColor } from "@/lib/cosmetics";
import { fallbackToOriginal, getOptimizedImageUrl } from "@/utils/optimized-image";
import { INK, LEVEL_GLOW, LIGHT, PAINT, oshiPaint } from "../palette";
import { PIXEL_HEART, PIXEL_STAR, heartPath, petalPath, pixelCells, sparklePath, starPath } from "./shapes";

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
    case "cafe.frame":
      // 壁の釘に、ひもで掛ける
      return <path d={`M10 6 L50 -12 L90 6`} fill="none" stroke={INK} strokeWidth="1.4" />;
    case "altar.frame": {
      // まわりのレース（半分だけ前の縁から出して、波のふちに見せる）
      const dots: [number, number][] = [];
      for (let x = 4; x <= 96; x += 9.2) dots.push([x, 2], [x, H - 2]);
      for (let y = 11; y <= H - 10; y += 9.2) dots.push([2, y], [98, y]);
      return (
        <g>
          {dots.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5.4" fill={PAINT.frame.lace.face} stroke={INK} strokeWidth="1" />
          ))}
        </g>
      );
    }
    case "lv3.flower":
      return <path d={ringRect(6, 6, 88, H - 12, 22, w.x, w.y, w.w, w.h, w.w * 0.1)} fillRule="evenodd" fill={PAINT.frame.flower.center} {...S} />;
    default:
      return null;
  }
}

/** 楕円（cx, cy, rx, ry）のパス。穴あきの縁（evenodd）を作るのに使う */
function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
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
    case "library.frame": {
      // アンティークの楕円の額縁
      const A = F.antique;
      const cx = 50;
      const cy = w.y + w.h / 2;
      return (
        <g>
          <path d={ellipsePath(cx, cy, 49, H / 2 - 1) + ellipsePath(cx, cy, w.w / 2, w.h / 2)} fillRule="evenodd" fill={A.face} {...S} />
          <ellipse cx={cx} cy={cy} rx={w.w / 2 + 4} ry={w.h / 2 + 4} fill="none" stroke={A.deep} strokeWidth="2.4" strokeDasharray="1.5 3" strokeLinecap="round" />
          <ellipse cx={cx} cy={cy} rx="44" ry={H / 2 - 6} fill="none" stroke={A.light} strokeWidth="1.6" opacity="0.8" />
          {/* 上の飾り（巻き） */}
          <path d={`M36 4 C40 -6 46 -4 50 2 C54 -4 60 -6 64 4 C58 0 54 4 50 8 C46 4 42 0 36 4Z`} fill={A.face} {...S} strokeWidth={1.6} />
          <circle cx="50" cy="2" r="3" fill={A.light} stroke={INK} strokeWidth="1" />
          <path d={`M40 ${H - 4} q10 8 20 0`} fill="none" stroke={A.deep} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      );
    }
    case "cafe.frame": {
      // 黒板のフレーム（木の枠・チョークのいたずら書き・下に置いたチョーク）
      const C = F.chalk;
      return (
        <g>
          <path d={ringRect(0, 0, 100, H, 4, w.x, w.y, w.w, w.h, 1)} fillRule="evenodd" fill={C.wood} {...S} />
          <path d={ringRect(6, 6, 88, H - 12, 2, w.x, w.y, w.w, w.h, 1)} fillRule="evenodd" fill={C.board} />
          <path d={heartPath(24, 15, 4.4)} fill="none" stroke={C.chalkPink} strokeWidth="1.8" />
          <path d={sparklePath(76, 15, 5)} fill="none" stroke={C.chalkYellow} strokeWidth="1.6" />
          <path d="M34 16 q4 -4 8 0 t8 0 t8 0" fill="none" stroke={C.chalk} strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
          <rect x={w.x - 2} y={w.y - 2} width={w.w + 4} height={w.h + 4} fill="none" stroke={C.chalk} strokeWidth="1.2" strokeDasharray="3 2" opacity="0.6" />
          <rect x="62" y={H - 7} width="14" height="4" rx="1.5" fill={C.chalk} stroke={INK} strokeWidth="0.8" />
          <path d="M4 3 h40" stroke={C.woodDeep} strokeWidth="1.4" opacity="0.6" />
        </g>
      );
    }
    case "space.frame": {
      // 宇宙船の丸窓（金属の縁とびょう、ガラスの光）
      const P = F.porthole;
      const cx = 50;
      const cy = w.y + w.h / 2;
      const r = w.w / 2;
      return (
        <g>
          <path d={ellipsePath(cx, cy, 49, 49) + ellipsePath(cx, cy, r, r)} fillRule="evenodd" fill={P.metal} {...S} />
          <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke={P.deep} strokeWidth="3" />
          {Array.from({ length: 8 }, (_, i) => {
            const t = (i / 8) * Math.PI * 2 + Math.PI / 8;
            return <circle key={i} cx={cx + Math.cos(t) * (r + 9)} cy={cy + Math.sin(t) * (r + 9)} r="2.6" fill={P.bolt} stroke={INK} strokeWidth="1" />;
          })}
          <path d={`M${cx - r * 0.6} ${cy - r * 0.2} A${r * 0.7} ${r * 0.7} 0 0 1 ${cx - r * 0.1} ${cy - r * 0.68}`} fill="none" stroke={P.bolt} strokeWidth="4" strokeLinecap="round" opacity="0.55" />
        </g>
      );
    }
    case "beach.frame": {
      // 貝殻のフレーム（上にホタテ、下にひとでと真珠）
      const Sh = F.shell;
      return (
        <g>
          <path d={ringRect(0, 12, 100, H - 12, 16, w.x, w.y, w.w, w.h, w.w * 0.1)} fillRule="evenodd" fill={Sh.face} {...S} />
          <rect x={w.x - 3} y={w.y - 3} width={w.w + 6} height={w.h + 6} rx={w.w * 0.12} fill="none" stroke={Sh.deep} strokeWidth="1.6" strokeDasharray="4 3" />
          {/* ホタテ */}
          <path d="M50 30 L28 10 Q50 -10 72 10Z" fill={Sh.face} {...S} />
          <path d="M50 30 L36 4 M50 30 L44 0 M50 30 L56 0 M50 30 L64 4" stroke={Sh.deep} strokeWidth="1.4" />
          <path d="M44 30 h12 l-2 4 h-8Z" fill={Sh.deep} stroke={INK} strokeWidth="1" />
          <path d={starPath(86, H - 10, 9, 0.5)} fill={Sh.star} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="12" cy={H - 10} r="5" fill={Sh.pearl} stroke={INK} strokeWidth="1.2" />
          <circle cx="10.5" cy={H - 11.5} r="1.6" fill={Sh.face} />
        </g>
      );
    }
    case "live.frame": {
      // ライブのチケット（右に推し色の半券。切り取り線と、上下の切れ込み）
      const Tk = F.ticket;
      const o = oshiPaint(oshi);
      const body = `M0 4 Q0 0 4 0 H70 A4 4 0 0 0 78 0 H96 Q100 0 100 4 V${H - 4} Q100 ${H} 96 ${H} H78 A4 4 0 0 0 70 ${H} H4 Q0 ${H} 0 ${H - 4}Z`;
      return (
        <g>
          <path d={body + `M${w.x} ${w.y}h${w.w}v${w.h}h${-w.w}Z`} fillRule="evenodd" fill={Tk.face} {...S} />
          <path d={`M78 0 H96 Q100 0 100 4 V${H - 4} Q100 ${H} 96 ${H} H78 A4 4 0 0 1 77 ${H - 3} V3 A4 4 0 0 1 78 0Z`} fill={o.base} />
          <path d={body} fill="none" {...S} />
          <path d={`M74 6 V${H - 6}`} stroke={Tk.punch} strokeWidth="1.4" strokeDasharray="2.4 2.4" />
          <path d={starPath(88.5, H * 0.3, 7)} fill={LIGHT} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={82 + i * 2.2} y={H * 0.55} width={i % 2 ? 1 : 1.6} height={H * 0.3} fill={LIGHT} opacity="0.85" />
          ))}
          <rect x={w.x} y={w.y} width={w.w} height={w.h} fill="none" stroke={Tk.line} strokeWidth="1.4" />
          <path d={`M${w.x} ${H - 4} h30`} stroke={Tk.line} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    }
    case "altar.frame": {
      // 推し色のレースのフレーム（金の内線と、上にリボン）
      const o = oshiPaint(oshi);
      const Fr = F.gold;
      return (
        <g>
          <path d={ringRect(2, 2, 96, H - 4, 3, w.x, w.y, w.w, w.h, 1)} fillRule="evenodd" fill={o.base} {...S} />
          <rect x={w.x - 4} y={w.y - 4} width={w.w + 8} height={w.h + 8} fill="none" stroke={Fr.face} strokeWidth="2.4" />
          {[[8, 8], [92, 8], [8, H - 8], [92, H - 8]].map(([x, y], i) => (
            <path key={i} d={heartPath(x, y, 3.6)} fill={LIGHT} />
          ))}
          <path d="M50 4 C38 -10 24 -6 30 4 C34 10 44 8 50 5Z M50 4 C62 -10 76 -6 70 4 C66 10 56 8 50 5Z" fill={o.deep} {...S} strokeWidth={1.4} />
          <circle cx="50" cy="4" r="4" fill={o.mid} stroke={INK} strokeWidth="1.2" />
        </g>
      );
    }
    case "retro.frame": {
      // ドットのフレーム（角を段々に欠いた縁と、市松のふち）
      const P = F.pixel;
      const outer = `M6 0 H94 V6 H100 V${H - 6} H94 V${H} H6 V${H - 6} H0 V6 H6Z`;
      return (
        <g>
          <path d={outer + `M${w.x} ${w.y}h${w.w}v${w.h}h${-w.w}Z`} fillRule="evenodd" fill={P.a} {...S} strokeLinejoin="miter" />
          {Array.from({ length: 11 }, (_, i) => (
            <g key={i}>
              <rect x={8 + i * 8} y="3" width="4" height="4" fill={i % 2 ? P.b : P.dark} />
              <rect x={8 + i * 8} y={H - 7} width="4" height="4" fill={i % 2 ? P.dark : P.b} />
            </g>
          ))}
          {pixelCells(PIXEL_HEART, 3, H / 2 - 6, 1.6).map((c, i) => (
            <rect key={`h${i}`} x={c.x} y={c.y} width={c.s} height={c.s} fill={P.b} />
          ))}
          {pixelCells(PIXEL_STAR, 86, H / 2 - 6, 1.6).map((c, i) => (
            <rect key={`s${i}`} x={c.x} y={c.y} width={c.s} height={c.s} fill={LIGHT} />
          ))}
          <rect x={w.x - 2} y={w.y - 2} width={w.w + 4} height={w.h + 4} fill="none" stroke={P.dark} strokeWidth="2" />
        </g>
      );
    }
    case "lv3.flower": {
      // なかよし Lv3 の特典: 花のリース（窓のまわりを小さな花と葉で囲む）
      const Fl = F.flower;
      const cx = 50;
      const cy = w.y + w.h / 2;
      const rx = w.w / 2 + 9;
      const ry = w.h / 2 + 9;
      const n = 14;
      return (
        <g>
          {Array.from({ length: n }, (_, i) => {
            const t = (i / n) * Math.PI * 2;
            const x = cx + Math.cos(t) * rx;
            const y = cy + Math.sin(t) * ry;
            return <ellipse key={`l${i}`} cx={x} cy={y} rx="6" ry="3" transform={`rotate(${(t * 180) / Math.PI + 60} ${x} ${y})`} fill={Fl.leaf} stroke={INK} strokeWidth="0.8" />;
          })}
          {Array.from({ length: 8 }, (_, i) => {
            const t = (i / 8) * Math.PI * 2 + 0.3;
            const x = cx + Math.cos(t) * rx;
            const y = cy + Math.sin(t) * ry;
            const c = [Fl.a, Fl.b, Fl.c][i % 3];
            return (
              <g key={`f${i}`}>
                {[0, 72, 144, 216, 288].map((d) => (
                  <circle key={d} cx={x + Math.cos((d * Math.PI) / 180) * 4.4} cy={y + Math.sin((d * Math.PI) / 180) * 4.4} r="4" fill={c} stroke={INK} strokeWidth="0.8" />
                ))}
                <circle cx={x} cy={y} r="2.4" fill={Fl.center} />
              </g>
            );
          })}
        </g>
      );
    }
    case "lv10.crown": {
      // なかよし Lv10 の特典: 王冠の額縁（金の縁に宝石、上に王冠）
      const C = F.crown;
      const top = 30;
      return (
        <g>
          <path d={ringRect(0, top, 100, H - top, 12, w.x, w.y, w.w, w.h, w.w * 0.1)} fillRule="evenodd" fill={C.gold} {...S} />
          <rect x={w.x - 3} y={w.y - 3} width={w.w + 6} height={w.h + 6} rx={w.w * 0.12} fill="none" stroke={C.deep} strokeWidth="2" />
          <path d={`M8 ${top + 6} h84`} stroke={C.light} strokeWidth="2" strokeLinecap="round" />
          {[[8, top + 8], [92, top + 8], [8, H - 8], [92, H - 8]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="4" fill={C.gems[i % 3]} stroke={INK} strokeWidth="1" />
          ))}
          {/* 王冠 */}
          <path d={`M18 ${top + 2} L14 6 L32 20 L50 0 L68 20 L86 6 L82 ${top + 2}Z`} fill={C.gold} {...S} />
          <path d={`M20 ${top - 4} h60`} stroke={C.deep} strokeWidth="2" />
          {[[14, 6], [50, 0], [86, 6]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3.4" fill={C.pearl} stroke={INK} strokeWidth="1" />
          ))}
          <path d={heartPath(50, 18, 5)} fill={C.gems[0]} stroke={INK} strokeWidth="1" />
          <circle cx="32" cy="22" r="2.6" fill={C.gems[1]} stroke={INK} strokeWidth="0.8" />
          <circle cx="68" cy="22" r="2.6" fill={C.gems[2]} stroke={INK} strokeWidth="0.8" />
        </g>
      );
    }
    default:
      return null;
  }
}
