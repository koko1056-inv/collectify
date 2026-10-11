import { useId } from "react";
import { motion } from "framer-motion";
import { FLOOR_Y, ROOM_H, ROOM_W, ROOM_WINDOW as WINDOW, type TimeOfDay } from "@/lib/oshiRoom";
import type { OshiColor } from "@/lib/cosmetics";
import { INK, LIGHT, PAINT, SHADE, SKY, oshiPaint } from "../palette";
import { cloudPath, heartPath, petalPath, sparklePath, starPath } from "./shapes";


interface RoomShellProps {
  wallpaper: string;
  floor: string;
  time: TimeOfDay;
  oshi: OshiColor;
  /** 動き（雲・花火・花びら・星のまたたき）。動きを減らす設定や、ショップの小さな見本では止める */
  animate: boolean;
}

/**
 * 部屋の入れ物（壁紙・窓・幅木・床）。家具やグッズはこの上に重ねる。
 * 全体を1枚の SVG（ROOM_W × ROOM_H）で描き、親の大きさに合わせて伸び縮みさせる。
 */
export function RoomShell({ wallpaper, floor, time, oshi, animate }: RoomShellProps) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox={`0 0 ${ROOM_W} ${ROOM_H}`} className="absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <Wallpaper id={id} k={wallpaper} oshi={oshi} animate={animate} />
      <Window id={id} time={time} wallpaper={wallpaper} oshi={oshi} animate={animate} />
      <Floor id={id} k={floor} oshi={oshi} />
    </svg>
  );
}

function wallPaint(k: string, oshi: OshiColor) {
  if (k === "oshi.wall") {
    const o = oshiPaint(oshi);
    return { base: o.light, pattern: o.mid, accent: LIGHT, curtain: o.base, curtainShade: o.deep };
  }
  return PAINT.wall[k] ?? PAINT.wall["base.cream"];
}

function Wallpaper({ id, k, oshi, animate }: { id: string; k: string; oshi: OshiColor; animate: boolean }) {
  const p = wallPaint(k, oshi);
  const pid = `${id}-wp`;
  const W = ROOM_W;
  const H = FLOOR_Y;
  let pattern: React.ReactNode = null;
  let extra: React.ReactNode = null;
  let baseFill: string = p.base;

  switch (k) {
    case "base.mint":
      pattern = (
        <pattern id={pid} width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="11" height="22" fill={p.pattern} opacity="0.7" />
          <circle cx="16.5" cy="11" r="1.4" fill={p.accent} />
        </pattern>
      );
      break;
    case "base.lilac":
      pattern = (
        <pattern id={pid} width="34" height="34" patternUnits="userSpaceOnUse">
          <path d={sparklePath(9, 9, 4.5)} fill={p.pattern} />
          <circle cx="26" cy="25" r="1.6" fill={p.pattern} />
          <circle cx="25" cy="8" r="1" fill={p.accent} />
        </pattern>
      );
      break;
    case "oshi.wall":
      pattern = (
        <pattern id={pid} width="30" height="30" patternUnits="userSpaceOnUse">
          <rect x="0" width="9" height="30" fill={p.pattern} opacity="0.55" />
          <path d={starPath(21, 10, 3.6)} fill={p.accent} opacity="0.95" />
        </pattern>
      );
      break;
    case "sakura.wall":
      pattern = (
        <pattern id={pid} width="46" height="46" patternUnits="userSpaceOnUse">
          {[0, 72, 144, 216, 288].map((d) => (
            <path key={d} d={petalPath(13, 13, 6, d)} fill={p.pattern} />
          ))}
          <circle cx="13" cy="13" r="1.6" fill={p.accent} />
          <path d={petalPath(34, 34, 5, 40)} fill={p.pattern} opacity="0.7" />
        </pattern>
      );
      if (animate) {
        extra = (
          <g>
            {[30, 90, 250, 320].map((x, i) => (
              <motion.path
                key={x}
                d={petalPath(0, 0, 6, 30)}
                fill={PAINT.sakura.petal}
                initial={{ x, y: -10, rotate: 0, opacity: 0 }}
                animate={{ x: [x, x + 18, x - 6, x + 10], y: [-10, 90, 180, 270], rotate: [0, 120, 220, 340], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 9, delay: i * 2.3, repeat: Infinity, ease: "linear" }}
              />
            ))}
          </g>
        );
      }
      break;
    case "natsu.wall":
      baseFill = `url(#${id}-night)`;
      pattern = (
        <pattern id={pid} width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="9" r="0.9" fill={p.accent} opacity="0.8" />
          <circle cx="29" cy="27" r="0.7" fill={LIGHT} opacity="0.7" />
        </pattern>
      );
      extra = <Fireworks animate={animate} />;
      break;
    case "halloween.wall":
      pattern = (
        <pattern id={pid} width="64" height="52" patternUnits="userSpaceOnUse">
          <path d="M14 18 q4 -6 8 0 q2 -4 4 -1 q2 -3 4 1 q4 -6 8 0 q-4 0 -6 4 q-2 -2 -6 -2 q-4 0 -6 2 q-2 -4 -6 -4Z" fill={p.pattern} />
          <circle cx="48" cy="38" r="1.6" fill={p.accent} opacity="0.85" />
          <circle cx="40" cy="10" r="1" fill={p.accent} opacity="0.6" />
        </pattern>
      );
      break;
    case "xmas.wall":
      pattern = (
        <pattern id={pid} width="44" height="44" patternUnits="userSpaceOnUse">
          <g stroke={p.pattern} strokeWidth="1.4" strokeLinecap="round">
            {[0, 60, 120].map((d) => (
              <line key={d} x1="12" y1="6" x2="12" y2="18" transform={`rotate(${d} 12 12)`} />
            ))}
          </g>
          <circle cx="33" cy="32" r="1.8" fill={p.accent} opacity="0.75" />
        </pattern>
      );
      extra = (
        // 壁の上に、赤と緑のガーランド
        <path d={`M0 10 Q45 26 90 10 T180 10 T270 10 T360 10`} fill="none" stroke={PAINT.xmasGarland} strokeWidth="5" strokeLinecap="round" />
      );
      break;
    case "yumekawa.wall":
      baseFill = `url(#${id}-yume)`;
      pattern = (
        <pattern id={pid} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d={heartPath(10, 10, 3.6)} fill={p.pattern} opacity="0.85" />
          <path d={sparklePath(30, 28, 4)} fill={p.pattern} opacity="0.9" />
        </pattern>
      );
      break;
    case "showcase.wall":
      pattern = (
        <pattern id={pid} width="60" height={H} patternUnits="userSpaceOnUse">
          <rect x="4" y="10" width="52" height={H - 20} rx="4" fill="none" stroke={p.pattern} strokeWidth="2" />
        </pattern>
      );
      extra = (
        <g>
          {[60, 300].map((x) => (
            <path key={x} d={`M${x - 8} 0 L${x + 8} 0 L${x + 50} ${H} L${x - 50} ${H}Z`} fill={`url(#${id}-beam)`} />
          ))}
          {[[40, 40], [320, 70], [250, 30], [30, 200], [330, 210]].map(([x, y], i) =>
            animate ? (
              <motion.path
                key={i}
                d={sparklePath(x, y, 4)}
                fill={p.accent}
                style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" }}
                animate={{ scale: [0.4, 1, 0.4], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2.4, delay: i * 0.5, repeat: Infinity }}
              />
            ) : (
              <path key={i} d={sparklePath(x, y, 4)} fill={p.accent} />
            )
          )}
        </g>
      );
      break;
    default:
      // base.cream
      pattern = (
        <pattern id={pid} width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="6.5" cy="6.5" r="1.8" fill={p.pattern} />
          <circle cx="19.5" cy="19.5" r="1.8" fill={p.pattern} />
          <path d={heartPath(19.5, 6, 1.8)} fill={p.accent} opacity="0.9" />
        </pattern>
      );
  }

  return (
    <g>
      <defs>
        {pattern}
        <linearGradient id={`${id}-night`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PAINT.natsuSkyTop} />
          <stop offset="1" stopColor={p.pattern} />
        </linearGradient>
        <linearGradient id={`${id}-yume`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={PAINT.yumekawaSky[0]} />
          <stop offset="0.5" stopColor={PAINT.yumekawaSky[1]} />
          <stop offset="1" stopColor={PAINT.yumekawaSky[2]} />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PAINT.beam} stopOpacity="0.32" />
          <stop offset="1" stopColor={PAINT.beam} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-wallshade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SHADE} stopOpacity="0" />
          <stop offset="0.75" stopColor={SHADE} stopOpacity="0" />
          <stop offset="1" stopColor={SHADE} stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill={baseFill} />
      {pattern && <rect x="0" y="0" width={W} height={H} fill={`url(#${pid})`} />}
      {extra}
      {/* 床に近いほど少し暗く（奥行き） */}
      <rect x="0" y="0" width={W} height={H} fill={`url(#${id}-wallshade)`} />
    </g>
  );
}

/** 夏祭りの壁の花火。ゆっくり開いて消えるのを繰り返す */
function Fireworks({ animate }: { animate: boolean }) {
  const bursts = [
    { x: 56, y: 70, r: 34, c: PAINT.fireworks[0], d: 0 },
    { x: 296, y: 64, r: 40, c: PAINT.fireworks[1], d: 1.3 },
    { x: 268, y: 178, r: 26, c: PAINT.fireworks[2], d: 2.4 },
    { x: 40, y: 196, r: 22, c: PAINT.fireworks[3], d: 3.1 },
  ];
  return (
    <g>
      {bursts.map((b, i) => {
        const rays = Array.from({ length: 12 }, (_, k) => {
          const ang = (k / 12) * Math.PI * 2;
          return (
            <line
              key={k}
              x1={b.x + Math.cos(ang) * b.r * 0.35}
              y1={b.y + Math.sin(ang) * b.r * 0.35}
              x2={b.x + Math.cos(ang) * b.r}
              y2={b.y + Math.sin(ang) * b.r}
              stroke={b.c}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          );
        });
        const dots = Array.from({ length: 12 }, (_, k) => {
          const ang = ((k + 0.5) / 12) * Math.PI * 2;
          return <circle key={k} cx={b.x + Math.cos(ang) * b.r * 0.75} cy={b.y + Math.sin(ang) * b.r * 0.75} r="1.4" fill={LIGHT} />;
        });
        if (!animate) return <g key={i} opacity="0.85">{rays}{dots}</g>;
        return (
          <motion.g
            key={i}
            style={{ transformOrigin: `${b.x}px ${b.y}px`, transformBox: "view-box" }}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: [0.2, 1, 1.12], opacity: [0, 1, 0] }}
            transition={{ duration: 2.2, delay: b.d, repeat: Infinity, repeatDelay: 2.2, ease: "easeOut" }}
          >
            {rays}
            {dots}
          </motion.g>
        );
      })}
    </g>
  );
}

function Window({ id, time, wallpaper, oshi, animate }: { id: string; time: TimeOfDay; wallpaper: string; oshi: OshiColor; animate: boolean }) {
  const { x, y, w, h } = WINDOW;
  const sky = SKY[time];
  const wp = wallPaint(wallpaper, oshi);
  const clip = `${id}-win`;
  const sun =
    time === "morning" ? { cx: x + 26, cy: y + 72, r: 11 } : time === "day" ? { cx: x + 72, cy: y + 26, r: 12 } : time === "evening" ? { cx: x + 70, cy: y + 86, r: 13 } : { cx: x + 70, cy: y + 30, r: 11 };
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx="3" />
        </clipPath>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.top} />
          <stop offset="1" stopColor={sky.bottom} />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={sky.glow} />
          <stop offset="1" stopColor={sky.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* 窓の外 */}
      <g clipPath={`url(#${clip})`}>
        <rect x={x} y={y} width={w} height={h} fill={`url(#${id}-sky)`} />
        <circle cx={sun.cx} cy={sun.cy} r={sun.r * 2.6} fill={`url(#${id}-sun)`} />
        {time === "night" ? (
          <>
            {/* 三日月: 丸から、少しずらした空色の丸を重ねて欠けさせる */}
            <circle cx={sun.cx} cy={sun.cy} r={sun.r} fill={sky.sun} />
            <circle cx={sun.cx + 5} cy={sun.cy - 3} r={sun.r - 1} fill={sky.top} />
            {[[x + 18, y + 20], [x + 40, y + 46], [x + 24, y + 70], [x + 84, y + 64], [x + 56, y + 16], [x + 82, y + 92]].map(([sx, sy], i) =>
              animate ? (
                <motion.path
                  key={i}
                  d={sparklePath(sx, sy, 2.6)}
                  fill={SKY.star}
                  style={{ transformOrigin: `${sx}px ${sy}px`, transformBox: "view-box" }}
                  animate={{ scale: [0.5, 1.1, 0.5], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2 + (i % 3) * 0.6, delay: i * 0.4, repeat: Infinity }}
                />
              ) : (
                <path key={i} d={sparklePath(sx, sy, 2.6)} fill={SKY.star} />
              )
            )}
          </>
        ) : (
          <circle cx={sun.cx} cy={sun.cy} r={sun.r} fill={sky.sun} />
        )}
        {[{ cy: y + 48, w: 34, d: 0 }, { cy: y + 84, w: 26, d: 9 }].map((c, i) => (
          <motion.path
            key={i}
            d={cloudPath(0, c.cy, c.w)}
            fill={sky.cloud}
            opacity={time === "night" ? 0.6 : 0.95}
            initial={{ x: x - 30 + i * 60 }}
            animate={animate ? { x: [x - 40, x + w + 10] } : { x: x + 10 + i * 46 }}
            transition={animate ? { duration: 26, delay: -c.d * 1.6, repeat: Infinity, ease: "linear" } : { duration: 0 }}
          />
        ))}
        {/* 遠くの街（夜は窓に明かり） */}
        <path
          d={`M${x} ${y + h} V${y + h - 16} h12 v-8 h10 v12 h8 v-18 h12 v14 h10 v-6 h14 v10 h10 v-14 h12 v18 h12 V${y + h}Z`}
          fill={SKY.city[time]}
          opacity="0.9"
        />
        {time === "night" &&
          [[x + 15, y + h - 10], [x + 48, y + h - 14], [x + 76, y + h - 8], [x + 92, y + h - 18]].map(([lx, ly], i) => (
            <rect key={i} x={lx} y={ly} width="3" height="3" fill={SKY.star} opacity="0.85" />
          ))}
      </g>
      {/* 窓枠 */}
      <rect x={x} y={y} width={w} height={h} rx="6" fill="none" stroke={SKY.frame} strokeWidth="8" />
      <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx="8" fill="none" stroke={INK} strokeWidth="1.6" />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx="3" fill="none" stroke={INK} strokeWidth="1.2" opacity="0.6" />
      <line x1={x + w / 2} y1={y + 4} x2={x + w / 2} y2={y + h - 4} stroke={SKY.frame} strokeWidth="5" />
      <line x1={x + 4} y1={y + h / 2} x2={x + w - 4} y2={y + h / 2} stroke={SKY.frame} strokeWidth="5" />
      {/* 窓に光のすじ */}
      <path d={`M${x + 14} ${y + 14} l18 0 l-12 26 l-18 0Z`} fill={LIGHT} opacity="0.25" />
      {/* 出窓の台 */}
      <rect x={x - 10} y={y + h + 2} width={w + 20} height="8" rx="3" fill={SKY.sill} stroke={INK} strokeWidth="1.4" />
      {/* カーテン（左右）と上の飾り */}
      <path
        d={`M${x - 16} ${y - 10} h22 c-2 30 6 60 -2 ${h + 4} c-8 4 -16 4 -22 0 c6 -40 -4 -80 2 -${h + 4}Z`}
        fill={wp.curtain}
        stroke={INK}
        strokeWidth="1.4"
      />
      <path d={`M${x - 6} ${y - 6} c-1 30 4 60 -2 ${h}`} fill="none" stroke={wp.curtainShade} strokeWidth="2.4" strokeLinecap="round" />
      <path
        d={`M${x + w + 16} ${y - 10} h-22 c2 30 -6 60 2 ${h + 4} c8 4 16 4 22 0 c-6 -40 4 -80 -2 -${h + 4}Z`}
        fill={wp.curtain}
        stroke={INK}
        strokeWidth="1.4"
      />
      <path d={`M${x + w + 6} ${y - 6} c1 30 -4 60 2 ${h}`} fill="none" stroke={wp.curtainShade} strokeWidth="2.4" strokeLinecap="round" />
      <path
        d={`M${x - 20} ${y - 14} h${w + 40} v10 q-${(w + 40) / 8} 10 -${(w + 40) / 4} 0 q-${(w + 40) / 8} 10 -${(w + 40) / 4} 0 q-${(w + 40) / 8} 10 -${(w + 40) / 4} 0 q-${(w + 40) / 8} 10 -${(w + 40) / 4} 0Z`}
        fill={wp.curtain}
        stroke={INK}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </g>
  );
}

function floorPaint(k: string, oshi: OshiColor) {
  if (k === "oshi.floor") {
    const o = oshiPaint(oshi);
    return { base: o.light, line: LIGHT, edge: o.base, board: o.mid };
  }
  return PAINT.floor[k] ?? PAINT.floor["base.wood"];
}

function Floor({ id, k, oshi }: { id: string; k: string; oshi: OshiColor }) {
  const p = floorPaint(k, oshi);
  const top = FLOOR_Y + 8;
  const H = ROOM_H - top;
  const pid = `${id}-fl`;
  let pattern: React.ReactNode = null;
  let overlay: React.ReactNode = null;

  switch (k) {
    case "base.carpet":
      pattern = (
        <pattern id={pid} width="14" height="12" patternUnits="userSpaceOnUse" y={top}>
          <circle cx="3.5" cy="3" r="1.2" fill={p.line} />
          <circle cx="10.5" cy="9" r="1.2" fill={p.line} />
        </pattern>
      );
      break;
    case "oshi.floor":
    case "halloween.floor":
    case "yumekawa.floor":
      pattern = (
        <pattern id={pid} width="48" height="32" patternUnits="userSpaceOnUse" y={top}>
          <rect width="24" height="16" fill={p.line} />
          <rect x="24" y="16" width="24" height="16" fill={p.line} />
        </pattern>
      );
      break;
    case "sakura.tatami":
      pattern = (
        <pattern id={pid} width="120" height="60" patternUnits="userSpaceOnUse" y={top}>
          {Array.from({ length: 10 }, (_, i) => (
            <line key={i} x1="0" y1={i * 6 + 3} x2="120" y2={i * 6 + 3} stroke={p.line} strokeWidth="1" />
          ))}
          <rect x="0" y="0" width="120" height="60" fill="none" stroke={p.edge} strokeWidth="4" />
        </pattern>
      );
      break;
    case "xmas.floor":
      pattern = (
        <pattern id={pid} width="28" height="20" patternUnits="userSpaceOnUse" y={top}>
          <path d="M14 2 L24 10 L14 18 L4 10Z" fill="none" stroke={p.line} strokeWidth="1.6" />
        </pattern>
      );
      overlay = <rect x="0" y={top + 4} width={ROOM_W} height="4" fill={p.edge} opacity="0.9" />;
      break;
    case "showcase.floor":
      overlay = (
        <g fill="none" stroke={p.line} strokeWidth="1.4" strokeLinecap="round" opacity="0.9">
          <path d={`M10 ${top + 30} q40 -10 70 12 t90 4`} />
          <path d={`M180 ${top + 70} q50 -18 90 6 t80 -10`} />
          <path d={`M40 ${top + 100} q30 8 60 -6`} />
          <path d={`M250 ${top + 24} q20 10 46 2`} />
        </g>
      );
      break;
    case "natsu.engawa":
    default:
      // 板張り（base.wood / natsu.engawa）。横長の板を、継ぎ目をずらして並べる
      pattern = (
        <pattern id={pid} width="120" height="36" patternUnits="userSpaceOnUse" y={top}>
          <line x1="0" y1="0.5" x2="120" y2="0.5" stroke={p.line} strokeWidth="1.6" />
          <line x1="0" y1="18.5" x2="120" y2="18.5" stroke={p.line} strokeWidth="1.6" />
          <line x1="40" y1="0" x2="40" y2="18" stroke={p.line} strokeWidth="1.4" />
          <line x1="100" y1="18" x2="100" y2="36" stroke={p.line} strokeWidth="1.4" />
          <path d="M8 8 q10 -3 20 0" stroke={p.line} strokeWidth="1" fill="none" opacity="0.6" />
          <path d="M60 27 q12 -3 24 0" stroke={p.line} strokeWidth="1" fill="none" opacity="0.6" />
        </pattern>
      );
  }

  return (
    <g>
      <defs>
        {pattern}
        <linearGradient id={`${id}-floorshade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SHADE} stopOpacity="0.12" />
          <stop offset="0.35" stopColor={SHADE} stopOpacity="0" />
          <stop offset="1" stopColor={LIGHT} stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={LIGHT} stopOpacity="0" />
          <stop offset="0.5" stopColor={LIGHT} stopOpacity="0.35" />
          <stop offset="1" stopColor={LIGHT} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y={top} width={ROOM_W} height={H} fill={p.base} />
      {pattern && <rect x="0" y={top} width={ROOM_W} height={H} fill={`url(#${pid})`} />}
      {overlay}
      {k === "showcase.floor" && <rect x="0" y={top} width={ROOM_W} height={H} fill={`url(#${id}-gloss)`} />}
      <rect x="0" y={top} width={ROOM_W} height={H} fill={`url(#${id}-floorshade)`} />
      {/* 幅木 */}
      <rect x="-2" y={FLOOR_Y} width={ROOM_W + 4} height="9" fill={p.board} stroke={INK} strokeWidth="1.4" />
      <line x1="0" y1={FLOOR_Y + 3} x2={ROOM_W} y2={FLOOR_Y + 3} stroke={p.edge} strokeWidth="1" opacity="0.6" />
    </g>
  );
}
