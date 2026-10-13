import { useId } from "react";
import { motion } from "framer-motion";
import { FLOOR_Y, ROOM_H, ROOM_W, ROOM_WINDOW as WINDOW, type TimeOfDay } from "@/lib/oshiRoom";
import type { OshiColor } from "@/lib/cosmetics";
import { INK, LIGHT, PAINT, SHADE, SKY, mix, oshiPaint } from "../palette";
import { PIXEL_HEART, PIXEL_STAR, cloudPath, heartPath, petalPath, pixelCells, sparklePath, starPath } from "./shapes";


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
  // 推し色セットと推し活祭壇は、持ち主の推し色で塗る
  if (k === "oshi.wall" || k === "altar.wall") {
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
    case "library.wall": {
      // 上は生成りの壁紙（ひし形の小紋）、下は木の腰板。本の背は家具（本棚）にまかせて、壁は落ち着かせる
      const Lb = PAINT.library;
      pattern = (
        <pattern id={pid} width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M14 5 L21 14 L14 23 L7 14Z" fill="none" stroke={p.pattern} strokeWidth="1.2" />
          <circle cx="14" cy="14" r="1.3" fill={p.accent} opacity="0.7" />
          <circle cx="0" cy="0" r="1.4" fill={p.pattern} />
          <circle cx="28" cy="28" r="1.4" fill={p.pattern} />
        </pattern>
      );
      extra = (
        <g>
          <rect x="0" y="196" width={W} height={H - 196} fill={Lb.panel} />
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x={i * 60 + 8} y="208" width="44" height={H - 222} rx="3" fill="none" stroke={Lb.panelDeep} strokeWidth="2.4" />
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <path key={`s${i}`} d={`M${i * 60 + 12} 212 h36`} stroke={LIGHT} strokeOpacity="0.18" strokeWidth="2" />
          ))}
          <rect x="-2" y="190" width={W + 4} height="8" fill={Lb.rail} stroke={INK} strokeWidth="1.2" />
        </g>
      );
      break;
    }
    case "cafe.wall": {
      // レンガの壁と、上に渡したカフェの電球
      pattern = (
        <pattern id={pid} width="40" height="20" patternUnits="userSpaceOnUse">
          <rect width="40" height="20" fill={p.accent} opacity="0.85" />
          <rect x="1" y="1" width="38" height="8" rx="1.5" fill={p.pattern} />
          <rect x="-19" y="11" width="38" height="8" rx="1.5" fill={p.pattern} opacity="0.85" />
          <rect x="21" y="11" width="38" height="8" rx="1.5" fill={p.pattern} opacity="0.92" />
        </pattern>
      );
      extra = (
        <g>
          <path d="M-4 8 Q45 26 90 10 T180 10 T270 10 T364 8" fill="none" stroke={INK} strokeWidth="1.2" />
          {Array.from({ length: 8 }, (_, i) => {
            const x = 22 + i * 45;
            // 線のたるみに沿わせる（谷は 45 ごと）
            const y = 10 + Math.abs(Math.sin(((x - 0) / 90) * Math.PI)) * 7;
            const bulb = <ellipse cx={x} cy={y + 7} rx="4" ry="5.4" fill={PAINT.lamp.bulb} stroke={INK} strokeWidth="1" />;
            return (
              <g key={i}>
                <rect x={x - 2} y={y} width="4" height="3" fill={INK} />
                {animate ? (
                  <motion.g animate={{ opacity: [1, 0.55, 1] }} transition={{ duration: 2.2, delay: i * 0.3, repeat: Infinity }}>
                    {bulb}
                  </motion.g>
                ) : (
                  bulb
                )}
              </g>
            );
          })}
        </g>
      );
      break;
    }
    case "space.wall": {
      const Sp = PAINT.space;
      baseFill = `url(#${id}-space)`;
      pattern = (
        <pattern id={pid} width="46" height="46" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="9" r="0.9" fill={p.accent} />
          <circle cx="31" cy="20" r="0.7" fill={LIGHT} opacity="0.8" />
          <circle cx="18" cy="38" r="1.1" fill={p.accent} opacity="0.7" />
        </pattern>
      );
      extra = (
        <g>
          <defs>
            <radialGradient id={`${id}-neb1`}>
              <stop offset="0" stopColor={Sp.nebula[0]} stopOpacity="0.45" />
              <stop offset="1" stopColor={Sp.nebula[0]} stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`${id}-neb2`}>
              <stop offset="0" stopColor={Sp.nebula[1]} stopOpacity="0.35" />
              <stop offset="1" stopColor={Sp.nebula[1]} stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="60" cy="90" rx="110" ry="70" fill={`url(#${id}-neb1)`} />
          <ellipse cx="300" cy="200" rx="120" ry="80" fill={`url(#${id}-neb2)`} />
          {/* 輪のある惑星と、小さな月 */}
          <circle cx="52" cy="62" r="22" fill={Sp.planet} stroke={INK} strokeWidth="1.4" />
          <path d="M32 56 q20 6 40 0" fill="none" stroke={Sp.planetBand} strokeWidth="3" />
          <ellipse cx="52" cy="64" rx="36" ry="8" fill="none" stroke={Sp.planetRing} strokeWidth="3" transform="rotate(-14 52 64)" />
          <circle cx="44" cy="214" r="9" fill={PAINT.moon.body} stroke={INK} strokeWidth="1.2" />
          <circle cx="41" cy="211" r="2" fill={PAINT.moon.shade} />
          {[[30, 40], [250, 140], [320, 250], [80, 160], [190, 250], [236, 30]].map(([x, y], i) =>
            animate ? (
              <motion.path
                key={i}
                d={sparklePath(x, y, 3.4)}
                fill={p.accent}
                style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" }}
                animate={{ scale: [0.4, 1.1, 0.4], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.2 + (i % 3) * 0.5, delay: i * 0.45, repeat: Infinity }}
              />
            ) : (
              <path key={i} d={sparklePath(x, y, 3.4)} fill={p.accent} />
            )
          )}
        </g>
      );
      break;
    }
    case "beach.wall": {
      // 空と海の壁。下のほうに波打ちぎわ
      const B = PAINT.beach;
      baseFill = `url(#${id}-beach)`;
      const sea = 178;
      const wave = (y: number) => `M-40 ${y} ${Array.from({ length: 11 }, () => "q10 -6 20 0 t20 0").join(" ")}`;
      extra = (
        <g>
          <defs>
            <radialGradient id={`${id}-bsun`}>
              <stop offset="0" stopColor={B.sun} stopOpacity="0.8" />
              <stop offset="1" stopColor={B.sun} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="306" cy="52" r="44" fill={`url(#${id}-bsun)`} />
          <circle cx="306" cy="52" r="16" fill={B.sun} stroke={INK} strokeWidth="1.2" />
          <path d={cloudPath(24, 76, 54)} fill={B.foam} opacity="0.95" />
          <path d={cloudPath(250, 128, 38)} fill={B.foam} opacity="0.85" />
          {[[58, 118], [80, 108], [262, 92]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y} q4 -5 8 0 q4 -5 8 0`} fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
          ))}
          <rect x="0" y={sea} width={W} height={H - sea} fill={B.sea} />
          <rect x="0" y={sea + 50} width={W} height={H - sea - 50} fill={B.seaDeep} opacity="0.55" />
          <line x1="0" y1={sea} x2={W} y2={sea} stroke={INK} strokeWidth="1.2" opacity="0.5" />
          <motion.g animate={animate ? { x: [0, -20, 0] } : undefined} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
            {[sea + 18, sea + 44, sea + 74].map((y, i) => (
              <path key={y} d={wave(y)} fill="none" stroke={B.foam} strokeWidth={i === 2 ? 3 : 2} strokeLinecap="round" opacity={0.75 - i * 0.12} transform={`translate(${(i % 2) * 14} 0)`} />
            ))}
          </motion.g>
          <path d={`M0 ${H - 12} q30 -10 60 -4 t70 -2 t80 4 t80 -4 t70 2 V${H}H0Z`} fill={B.foam} opacity="0.85" />
        </g>
      );
      break;
    }
    case "live.wall": {
      // ステージ: 暗い幕の前に、色の光の筋。上に赤い一文字幕と金のふさ
      const Lv = PAINT.live;
      pattern = (
        <pattern id={pid} width="24" height={H} patternUnits="userSpaceOnUse">
          <rect x="0" width="12" height={H} fill={p.pattern} />
        </pattern>
      );
      const beams = [
        { x: 50, c: Lv.beams[0], d: 0 },
        { x: 180, c: Lv.beams[1], d: 1.2 },
        { x: 310, c: Lv.beams[2], d: 0.6 },
      ];
      extra = (
        <g>
          <defs>
            {beams.map((b, i) => (
              <linearGradient key={i} id={`${id}-lb${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={b.c} stopOpacity="0.55" />
                <stop offset="1" stopColor={b.c} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {beams.map((b, i) => {
            const cone = <path d={`M${b.x - 6} 20 L${b.x + 6} 20 L${b.x + 60} ${H} L${b.x - 60} ${H}Z`} fill={`url(#${id}-lb${i})`} />;
            return animate ? (
              <motion.g
                key={i}
                style={{ transformOrigin: `${b.x}px 20px`, transformBox: "view-box" }}
                animate={{ rotate: [-12, 12, -12] }}
                transition={{ duration: 5 + i, delay: b.d, repeat: Infinity, ease: "easeInOut" }}
              >
                {cone}
              </motion.g>
            ) : (
              <g key={i} transform={`rotate(${(i - 1) * 8} ${b.x} 20)`}>
                {cone}
              </g>
            );
          })}
          <path d={`M0 0 H${W} V18 ${Array.from({ length: 9 }, () => "q-20 14 -40 0").join(" ")}Z`} fill={p.curtain} stroke={INK} strokeWidth="1.4" />
          <path d={`M0 18 ${Array.from({ length: 9 }, () => "q20 14 40 0").join(" ")}`} fill="none" stroke={Lv.fringe} strokeWidth="2.4" strokeDasharray="2 3" />
          {beams.map((b, i) => (
            <g key={i}>
              <rect x={b.x - 9} y="12" width="18" height="10" rx="3" fill={INK} />
              <circle cx={b.x} cy="20" r="4" fill={b.c} />
            </g>
          ))}
        </g>
      );
      break;
    }
    case "altar.wall": {
      // 推し色の壁に、ドレープ（布を波に吊ったもの）と金のロゼット。推しを祀る祭壇の背景
      const G = PAINT.altar;
      pattern = (
        <pattern id={pid} width="36" height="36" patternUnits="userSpaceOnUse">
          <path d={starPath(9, 9, 3.4)} fill={p.accent} opacity="0.9" />
          <path d={heartPath(27, 27, 3.2)} fill={p.pattern} />
        </pattern>
      );
      extra = (
        <g>
          {[0, 120, 240].map((x) => (
            <g key={x}>
              <path d={`M${x} 0 Q${x + 60} 52 ${x + 120} 0 Z`} fill={p.pattern} stroke={INK} strokeWidth="1.3" />
              <path d={`M${x + 10} 4 Q${x + 60} 40 ${x + 110} 4`} fill="none" stroke={p.curtainShade} strokeWidth="2" opacity="0.6" />
              <path d={`M${x + 18} 0 Q${x + 60} 30 ${x + 102} 0`} fill="none" stroke={LIGHT} strokeWidth="1.6" opacity="0.5" />
            </g>
          ))}
          {[0, 120, 240, 360].map((x) => (
            <g key={x}>
              <path d={`M${x - 3} 12 l-3 20 M${x + 3} 12 l3 20`} stroke={p.curtain} strokeWidth="3" strokeLinecap="round" />
              <circle cx={x} cy="6" r="9" fill={G.gold} stroke={INK} strokeWidth="1.3" />
              <circle cx={x} cy="6" r="4" fill={G.goldDeep} />
            </g>
          ))}
        </g>
      );
      break;
    }
    case "retro.wall": {
      // ドット絵の壁: 小さな四角の市松と、ドットのハート・星
      const R = PAINT.retro;
      pattern = (
        <pattern id={pid} width="76" height="76" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="6" height="6" fill={p.pattern} />
          <rect x="30" y="30" width="6" height="6" fill={p.pattern} />
          {/* 1マスずつ透かすと、マスの境目に線が出る。まとめて透かす */}
          <g opacity="0.55">
            {pixelCells(PIXEL_HEART, 12, 44, 3).map((c, i) => (
              <rect key={`h${i}`} x={c.x} y={c.y} width={c.s} height={c.s} fill={R.pixel} />
            ))}
          </g>
          <g opacity="0.5">
            {pixelCells(PIXEL_STAR, 48, 8, 3).map((c, i) => (
              <rect key={`s${i}`} x={c.x} y={c.y} width={c.s} height={c.s} fill={p.accent} />
            ))}
          </g>
        </pattern>
      );
      extra = <rect x="0" y={H - 12} width={W} height="4" fill={p.accent} opacity="0.7" />;
      break;
    }
    case "lv5.wall": {
      // なかよし Lv5 の特典: 星座の壁。星を線でつないだ形が、ゆっくりまたたく
      const C = PAINT.constellation;
      baseFill = `url(#${id}-lv5)`;
      pattern = (
        <pattern id={pid} width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="10" r="0.9" fill={C.star} opacity="0.8" />
          <circle cx="30" cy="28" r="0.7" fill={LIGHT} opacity="0.6" />
        </pattern>
      );
      extra = (
        <g>
          {CONSTELLATIONS.map((pts, gi) => (
            <g key={gi}>
              <path d={`M${pts.map(([x, y]) => `${x} ${y}`).join(" L")}`} fill="none" stroke={C.line} strokeWidth="1" opacity="0.6" />
              {pts.map(([x, y], i) =>
                animate ? (
                  <motion.path
                    key={i}
                    d={sparklePath(x, y, 3.6)}
                    fill={C.star}
                    style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" }}
                    animate={{ scale: [0.6, 1.1, 0.6], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2.4, delay: (gi * 4 + i) * 0.3, repeat: Infinity }}
                  />
                ) : (
                  <path key={i} d={sparklePath(x, y, 3.6)} fill={C.star} />
                )
              )}
            </g>
          ))}
        </g>
      );
      break;
    }
    case "lv10.wall": {
      // なかよし Lv10 の特典: 淡い虹の壁と、雲・きらめき
      const R = PAINT.rainbow;
      baseFill = `url(#${id}-rainbow)`;
      pattern = (
        <pattern id={pid} width="44" height="44" patternUnits="userSpaceOnUse">
          <path d={sparklePath(11, 11, 3.6)} fill={p.accent} opacity="0.9" />
          <path d={heartPath(33, 32, 2.8)} fill={p.accent} opacity="0.7" />
        </pattern>
      );
      extra = (
        <g>
          <path d={cloudPath(14, 250, 74)} fill={LIGHT} opacity="0.9" />
          <path d={cloudPath(264, 256, 84)} fill={LIGHT} opacity="0.9" />
          <path d={cloudPath(250, 64, 44)} fill={LIGHT} opacity="0.8" />
          {[[40, 30], [320, 120], [70, 140], [230, 200]].map(([x, y], i) =>
            animate ? (
              <motion.path
                key={i}
                d={sparklePath(x, y, 5)}
                fill={R[(i * 2) % R.length]}
                stroke={INK}
                strokeWidth="0.6"
                style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" }}
                animate={{ scale: [0.5, 1.1, 0.5], rotate: [0, 45, 0] }}
                transition={{ duration: 2.6, delay: i * 0.6, repeat: Infinity }}
              />
            ) : (
              <path key={i} d={sparklePath(x, y, 5)} fill={R[(i * 2) % R.length]} stroke={INK} strokeWidth="0.6" />
            )
          )}
        </g>
      );
      break;
    }
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
        {/* 宇宙・海辺・星座・虹の壁の地（グラデーション） */}
        <linearGradient id={`${id}-space`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(p.base, SHADE, 0.3)} />
          <stop offset="1" stopColor={p.pattern} />
        </linearGradient>
        <linearGradient id={`${id}-beach`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PAINT.beach.skyTop} />
          <stop offset="0.6" stopColor={p.base} />
        </linearGradient>
        <linearGradient id={`${id}-lv5`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(p.base, SHADE, 0.2)} />
          <stop offset="1" stopColor={p.pattern} />
        </linearGradient>
        <linearGradient id={`${id}-rainbow`} x1="0" y1="0" x2="1" y2="1">
          {PAINT.rainbow.map((c, i) => (
            <stop key={i} offset={i / (PAINT.rainbow.length - 1)} stopColor={mix(c, LIGHT, 0.62)} />
          ))}
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

/** 星座の壁の星の並び（部屋の単位） */
const CONSTELLATIONS = [
  [[30, 40], [58, 30], [84, 52], [70, 82], [40, 74]],
  [[250, 40], [276, 60], [306, 48], [330, 76]],
  [[40, 170], [70, 150], [96, 176], [128, 160]],
  [[250, 160], [280, 190], [320, 170], [300, 222]],
];

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

/** つやのある床（斜めに光のすじを重ねる） */
const GLOSSY_FLOORS = new Set(["showcase.floor", "lv7.floor", "live.floor"]);

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
    case "library.floor":
      // 寄木（ヘリンボーン）。V の字の板を縦に重ねる
      pattern = (
        <pattern id={pid} width="32" height="14" patternUnits="userSpaceOnUse" y={top}>
          <path d="M0 14 L16 4 L32 14" fill="none" stroke={p.line} strokeWidth="1.6" />
          <path d="M8 9 v5 M24 9 v5" stroke={p.line} strokeWidth="1.2" opacity="0.7" />
        </pattern>
      );
      break;
    case "cafe.floor":
      // テラコッタのタイル（目地は明るく、1枚おきに少し色を変える）
      pattern = (
        <pattern id={pid} width="48" height="24" patternUnits="userSpaceOnUse" y={top}>
          <rect x="24" y="0" width="24" height="24" fill={p.edge} opacity="0.35" />
          <path d="M0 0.5 H48 M0.5 0 V24 M24.5 0 V24" stroke={p.line} strokeWidth="1.6" />
        </pattern>
      );
      break;
    case "space.floor":
      // 宇宙船の床: 金属の板とびょう、光る線
      pattern = (
        <pattern id={pid} width="60" height="32" patternUnits="userSpaceOnUse" y={top}>
          <rect x="1" y="1" width="58" height="30" rx="3" fill="none" stroke={p.line} strokeWidth="1.6" />
          {[[6, 6], [54, 6], [6, 26], [54, 26]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.3" fill={p.line} />
          ))}
        </pattern>
      );
      overlay = (
        <g>
          <rect x="0" y={top + 29} width={ROOM_W} height="5" fill={p.edge} opacity="0.2" />
          <rect x="0" y={top + 30} width={ROOM_W} height="3" fill={p.edge} opacity="0.8" />
        </g>
      );
      break;
    case "beach.floor": {
      // 砂浜: 細かい砂つぶと、貝殻・ひとで
      const B = PAINT.beach;
      pattern = (
        <pattern id={pid} width="26" height="18" patternUnits="userSpaceOnUse" y={top}>
          <circle cx="4" cy="4" r="0.9" fill={p.line} />
          <circle cx="16" cy="12" r="1.1" fill={p.line} />
          <circle cx="22" cy="3" r="0.7" fill={p.edge} />
        </pattern>
      );
      overlay = (
        <g>
          <path d={starPath(42, top + 100, 7, 0.5)} fill={B.star} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          <path d={`M300 ${top + 108} q8 -14 16 0 Z`} fill={B.shell} stroke={INK} strokeWidth="1" />
          <path d={`M304 ${top + 108} l4 -10 M308 ${top + 108} l0 -11 M312 ${top + 108} l-4 -10`} stroke={INK} strokeWidth="0.6" opacity="0.6" />
          <path d={`M168 ${top + 116} q6 -10 12 0 Z`} fill={LIGHT} stroke={INK} strokeWidth="1" />
        </g>
      );
      break;
    }
    case "live.floor":
      // ステージの床: 黒い板と、前のふちに光の線（足もとのライト）
      pattern = (
        <pattern id={pid} width="90" height="22" patternUnits="userSpaceOnUse" y={top}>
          <line x1="0" y1="0.5" x2="90" y2="0.5" stroke={p.line} strokeWidth="1.4" />
          <line x1="40" y1="0" x2="40" y2="22" stroke={p.line} strokeWidth="1.2" />
        </pattern>
      );
      overlay = (
        <g>
          <rect x="0" y={top + 2} width={ROOM_W} height="3" fill={p.edge} opacity="0.85" />
          {[30, 90, 150, 210, 270, 330].map((x, i) => (
            <circle key={x} cx={x} cy={ROOM_H - 9} r="3" fill={PAINT.live.beams[i % 3]} opacity="0.85" />
          ))}
        </g>
      );
      break;
    case "altar.floor":
      // ふわふわの白いラグ（小さな巻き毛の模様）
      pattern = (
        <pattern id={pid} width="20" height="16" patternUnits="userSpaceOnUse" y={top}>
          <path d="M3 9 q3 -5 6 0 q3 5 6 0" fill="none" stroke={p.line} strokeWidth="1.6" strokeLinecap="round" />
        </pattern>
      );
      break;
    case "retro.floor":
      // ネオンの格子（奥へすぼまる線）
      overlay = (
        <g stroke={p.line} strokeWidth="1.3" opacity="0.85">
          {[0, 10, 24, 44, 72, 108].map((d) => (
            <line key={d} x1="0" y1={top + 4 + d} x2={ROOM_W} y2={top + 4 + d} />
          ))}
          {Array.from({ length: 13 }, (_, i) => {
            const x = (i - 6) * 60;
            return <line key={i} x1={ROOM_W / 2 + x * 0.25} y1={top} x2={ROOM_W / 2 + x * 1.6} y2={ROOM_H} />;
          })}
          <rect x="0" y={top} width={ROOM_W} height="3" fill={p.edge} stroke="none" opacity="0.9" />
        </g>
      );
      break;
    case "lv7.floor":
      // なかよし Lv7 の特典: 金と白の市松（つや付き）
      pattern = (
        <pattern id={pid} width="44" height="26" patternUnits="userSpaceOnUse" y={top}>
          <rect width="22" height="13" fill={p.line} opacity="0.75" />
          <rect x="22" y="13" width="22" height="13" fill={p.line} opacity="0.75" />
          <path d="M0 0.5 H44 M0.5 0 V26" stroke={p.edge} strokeWidth="0.8" opacity="0.6" />
        </pattern>
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
      {GLOSSY_FLOORS.has(k) && <rect x="0" y={top} width={ROOM_W} height={H} fill={`url(#${id}-gloss)`} />}
      <rect x="0" y={top} width={ROOM_W} height={H} fill={`url(#${id}-floorshade)`} />
      {/* 幅木 */}
      <rect x="-2" y={FLOOR_Y} width={ROOM_W + 4} height="9" fill={p.board} stroke={INK} strokeWidth="1.4" />
      <line x1="0" y1={FLOOR_Y + 3} x2={ROOM_W} y2={FLOOR_Y + 3} stroke={p.edge} strokeWidth="1" opacity="0.6" />
    </g>
  );
}
