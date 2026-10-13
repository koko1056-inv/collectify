import { useId } from "react";
import { motion } from "framer-motion";
import { FURNITURE_DEFS } from "@/lib/oshiRoom";
import type { OshiColor } from "@/lib/cosmetics";
import { INK, LIGHT, PAINT, oshiPaint } from "../palette";
import { PIXEL_HEART, PIXEL_STAR, cloudPath, heartPath, petalPath, pixelCells, sparklePath, starPath } from "./shapes";

interface FurnitureArtProps {
  k: string;
  oshi: OshiColor;
  /** ゆらゆら・またたきなどの待機の動き */
  animate: boolean;
  /** 夜（明かりが灯る） */
  lit: boolean;
}

/**
 * 家具の絵。家具の箱（FURNITURE_DEFS の w × h）いっぱいに描く。置く位置・大きさ・反転は親が決める。
 * 線は INK（テーマで少し変わる）、色は palette の PAINT。
 */
export function FurnitureArt({ k, oshi, animate, lit }: FurnitureArtProps) {
  const def = FURNITURE_DEFS[k];
  const id = useId().replace(/:/g, "");
  if (!def) return null;
  return (
    <svg viewBox={`0 0 ${def.w} ${def.h}`} className="block h-full w-full overflow-visible" aria-hidden="true">
      <Piece k={k} id={id} oshi={oshi} animate={animate} lit={lit} />
    </svg>
  );
}

const S = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** ゆれる（根もと originX/Y を軸に、左右に少し） */
function Sway({ children, ox, oy, deg = 2, dur = 4, animate }: { children: React.ReactNode; ox: number; oy: number; deg?: number; dur?: number; animate: boolean }) {
  if (!animate) return <g>{children}</g>;
  return (
    <motion.g
      style={{ transformOrigin: `${ox}px ${oy}px`, transformBox: "view-box" }}
      animate={{ rotate: [-deg, deg, -deg] }}
      transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.g>
  );
}

function Piece({ k, id, oshi, animate, lit }: { k: string; id: string; oshi: OshiColor; animate: boolean; lit: boolean }) {
  const W = PAINT.wood;
  switch (k) {
    case "base.shelf":
      return (
        <g>
          <rect x="2" y="0" width="100" height="170" rx="5" fill={W.mid} {...S} />
          <rect x="9" y="10" width="86" height="76" rx="2" fill={W.dark} opacity="0.45" />
          <rect x="9" y="94" width="86" height="66" rx="2" fill={W.dark} opacity="0.45" />
          <rect x="0" y="0" width="104" height="10" rx="4" fill={W.light} {...S} />
          <rect x="7" y="86" width="90" height="8" rx="2" fill={W.light} {...S} />
          <rect x="7" y="160" width="90" height="8" rx="2" fill={W.light} {...S} />
          <path d="M14 14 v68 M14 98 v58" stroke={LIGHT} strokeOpacity="0.3" strokeWidth="2" />
          <rect x="4" y="166" width="10" height="4" fill={W.deep} />
          <rect x="90" y="166" width="10" height="4" fill={W.deep} />
        </g>
      );
    case "base.desk":
      return (
        <g>
          <rect x="12" y="8" width="10" height="76" rx="2" fill={W.dark} {...S} />
          <rect x="128" y="8" width="10" height="76" rx="2" fill={W.dark} {...S} />
          <rect x="20" y="58" width="110" height="5" fill={W.dark} opacity="0.7" />
          <rect x="90" y="9" width="44" height="32" rx="3" fill={W.mid} {...S} />
          <rect x="104" y="22" width="16" height="5" rx="2.5" fill={W.light} {...S} strokeWidth={1.2} />
          <rect x="0" y="2" width="150" height="10" rx="4" fill={W.light} {...S} />
          <path d="M8 5 h60" stroke={LIGHT} strokeOpacity="0.5" strokeWidth="2" />
        </g>
      );
    case "base.rug":
      return (
        <g>
          <ellipse cx="105" cy="24" rx="102" ry="18" fill={PAINT.rug.base} {...S} />
          <ellipse cx="105" cy="24" rx="88" ry="12" fill="none" stroke={PAINT.rug.edge} strokeWidth="3" strokeDasharray="2 6" strokeLinecap="round" />
          {[50, 80, 130, 160, 105].map((x, i) => (
            <path key={x} d={heartPath(x, i % 2 ? 26 : 22, 3)} fill={PAINT.rug.dot} />
          ))}
        </g>
      );
    case "base.plant":
      return (
        <g>
          <Sway ox={30} oy={74} animate={animate}>
            <path d="M30 76 C18 60 6 52 4 34 C16 38 26 50 30 70Z" fill={PAINT.plant.leaf} {...S} />
            <path d="M30 76 C42 58 56 50 58 30 C44 36 34 50 30 70Z" fill={PAINT.plant.leaf} {...S} />
            <path d="M30 76 C24 50 20 30 30 4 C40 30 36 50 30 76Z" fill={PAINT.plant.leafDeep} {...S} />
            <path d="M30 70 C22 58 12 50 14 40" fill="none" stroke={PAINT.plant.leafDeep} strokeWidth="1.2" />
            <path d="M30 70 C38 58 48 50 48 40" fill="none" stroke={PAINT.plant.leafDeep} strokeWidth="1.2" />
          </Sway>
          <path d="M10 72 h40 l-5 40 h-30Z" fill={PAINT.plant.pot} {...S} />
          <rect x="7" y="68" width="46" height="10" rx="3" fill={PAINT.plant.potShade} {...S} />
          <path d={heartPath(30, 92, 5)} fill={LIGHT} opacity="0.7" />
        </g>
      );
    case "base.lamp":
      return (
        <g>
          {lit && <circle cx="23" cy="34" r="22" fill={`url(#${id}-bulb)`} />}
          <defs>
            <radialGradient id={`${id}-bulb`}>
              <stop offset="0" stopColor={PAINT.lamp.bulb} stopOpacity="0.95" />
              <stop offset="1" stopColor={PAINT.lamp.bulb} stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x="21" y="40" width="4" height="112" fill={PAINT.lamp.pole} {...S} strokeWidth={1.2} />
          <ellipse cx="23" cy="154" rx="16" ry="5" fill={PAINT.lamp.pole} {...S} />
          <path d="M10 8 h26 l8 34 h-42Z" fill={lit ? PAINT.lamp.bulb : PAINT.lamp.shade} {...S} />
          <path d="M14 14 h18" stroke={PAINT.lamp.shadeDeep} strokeWidth="2" />
          <path d="M7 36 h32" stroke={PAINT.lamp.shadeDeep} strokeWidth="2" />
        </g>
      );
    case "base.wallshelf":
      return (
        <g>
          <path d="M18 12 v12 l12 -12Z" fill={W.dark} {...S} />
          <path d="M102 12 v12 l-12 -12Z" fill={W.dark} {...S} />
          <rect x="0" y="4" width="120" height="9" rx="3" fill={W.light} {...S} />
        </g>
      );
    case "oshi.penlight": {
      const o = oshiPaint(oshi);
      const sticks = [-22, -8, 8, 22];
      return (
        <g>
          {sticks.map((deg, i) => (
            <g key={deg} transform={`rotate(${deg} 25 62)`}>
              <rect x="22.5" y="6" width="5" height="56" rx="2.5" fill={i === 1 ? LIGHT : o.base} {...S} strokeWidth={1.2} />
              <rect x="22" y="56" width="6" height="12" rx="2" fill={PAINT.penlightGrip} />
              {(lit || animate) && (
                <motion.rect
                  x="20"
                  y="4"
                  width="10"
                  height="40"
                  rx="5"
                  fill={i === 1 ? LIGHT : o.base}
                  initial={{ opacity: lit ? 0.5 : 0.15 }}
                  animate={animate ? { opacity: lit ? [0.35, 0.7, 0.35] : [0.1, 0.25, 0.1] } : undefined}
                  transition={{ duration: 1.6, delay: i * 0.3, repeat: Infinity }}
                  style={{ filter: "blur(3px)" }}
                />
              )}
            </g>
          ))}
          <path d="M8 60 h34 l-4 36 h-26Z" fill={PAINT.cup} {...S} />
          <rect x="10" y="72" width="30" height="7" fill={o.base} />
          <path d={heartPath(25, 88, 3.4)} fill={o.base} />
        </g>
      );
    }
    case "oshi.garland": {
      const o = oshiPaint(oshi);
      const n = 9;
      return (
        <g>
          <path d="M4 6 Q110 34 216 6" fill="none" {...S} />
          {Array.from({ length: n }, (_, i) => {
            const t = (i + 0.5) / n;
            const x = 4 + t * 212;
            const y = 6 + 4 * 14 * t * (1 - t) * 2;
            const fill = i % 3 === 0 ? o.base : i % 3 === 1 ? LIGHT : o.mid;
            return (
              <g key={i}>
                <path d={`M${x - 9} ${y - 1} h18 l-9 ${20}Z`} fill={fill} {...S} strokeWidth={1.3} />
                {i % 3 === 1 && <path d={starPath(x, y + 6, 3.4)} fill={o.base} />}
              </g>
            );
          })}
          <circle cx="4" cy="6" r="3" fill={o.deep} {...S} strokeWidth={1.2} />
          <circle cx="216" cy="6" r="3" fill={o.deep} {...S} strokeWidth={1.2} />
        </g>
      );
    }
    case "sakura.tree":
      return (
        <g>
          <Sway ox={55} oy={118} deg={1.5} dur={5} animate={animate}>
            <path d="M55 120 C52 96 40 84 30 70 M55 104 C64 90 76 80 86 66 M54 112 C56 92 58 70 56 50" fill="none" stroke={PAINT.sakura.trunk} strokeWidth="6" strokeLinecap="round" />
            {[[30, 62, 24], [84, 58, 24], [56, 40, 28], [40, 34, 18], [74, 32, 18], [18, 80, 14], [96, 80, 14]].map(([cx, cy, r], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill={i % 2 ? PAINT.sakura.petal : PAINT.sakura.petalLight} {...S} strokeWidth={1.3} />
            ))}
            {[[28, 58], [50, 34], [70, 44], [86, 60], [40, 70], [62, 26], [96, 76], [18, 78]].map(([x, y], i) => (
              <g key={i}>
                {[0, 72, 144, 216, 288].map((d) => (
                  <path key={d} d={petalPath(x, y, 4, d)} fill={PAINT.sakura.petalDeep} opacity="0.8" />
                ))}
              </g>
            ))}
          </Sway>
          <path d="M28 118 h54 l-6 32 h-42Z" fill={PAINT.sakura.pot} {...S} />
          <rect x="24" y="114" width="62" height="9" rx="3" fill={PAINT.sakura.potShade} {...S} />
          <path d="M40 134 q15 8 30 0" fill="none" stroke={LIGHT} strokeWidth="1.6" opacity="0.6" />
        </g>
      );
    case "sakura.branch":
      return (
        <g>
          <path d="M2 30 C40 24 70 40 110 30 C126 26 138 18 148 20 M70 36 C80 48 92 54 104 56 M40 28 C46 18 54 12 64 10" fill="none" stroke={PAINT.sakura.trunk} strokeWidth="4" strokeLinecap="round" />
          {[[20, 28], [52, 14], [64, 32], [96, 32], [104, 54], [128, 22], [146, 18], [84, 48]].map(([x, y], i) => (
            <g key={i}>
              {[0, 72, 144, 216, 288].map((d) => (
                <path key={d} d={petalPath(x, y, 7, d + i * 10)} fill={i % 2 ? PAINT.sakura.petal : PAINT.sakura.petalLight} stroke={INK} strokeWidth="0.8" />
              ))}
              <circle cx={x} cy={y} r="1.8" fill={PAINT.sakura.petalDeep} />
            </g>
          ))}
        </g>
      );
    case "natsu.chochin":
      return (
        <Sway ox={26} oy={0} deg={3} dur={3.4} animate={animate}>
          <defs>
            <radialGradient id={`${id}-cg`}>
              <stop offset="0" stopColor={PAINT.chochin.glow} stopOpacity="0.95" />
              <stop offset="1" stopColor={PAINT.chochin.body} stopOpacity="1" />
            </radialGradient>
          </defs>
          <line x1="26" y1="0" x2="26" y2="12" {...S} />
          <rect x="14" y="10" width="24" height="8" rx="2" fill={PAINT.chochin.cap} {...S} />
          <ellipse cx="26" cy="52" rx="24" ry="34" fill={lit ? `url(#${id}-cg)` : PAINT.chochin.body} {...S} />
          {[30, 40, 52, 64, 74].map((y) => (
            <path key={y} d={`M${26 - Math.sqrt(Math.max(0, 1 - ((y - 52) / 34) ** 2)) * 24} ${y} Q26 ${y + 3} ${26 + Math.sqrt(Math.max(0, 1 - ((y - 52) / 34) ** 2)) * 24} ${y}`} fill="none" stroke={PAINT.chochin.rib} strokeWidth="1.2" />
          ))}
          <circle cx="26" cy="52" r="9" fill={PAINT.chochin.text} />
          <path d="M19 54 q3.5 -5 7 0 t7 0" fill="none" stroke={PAINT.chochin.rib} strokeWidth="1.6" />
          <rect x="14" y="84" width="24" height="8" rx="2" fill={PAINT.chochin.cap} {...S} />
          <path d="M22 92 v4 M26 92 v4 M30 92 v4" stroke={PAINT.chochin.cap} strokeWidth="1.4" />
        </Sway>
      );
    case "natsu.kingyo":
      return (
        <g>
          <path d="M16 84 h48 l-4 20 h-40Z" fill={PAINT.kingyo.stand} {...S} />
          <defs>
            <clipPath id={`${id}-bowl`}>
              <circle cx="40" cy="50" r="30" />
            </clipPath>
          </defs>
          <circle cx="40" cy="50" r="30" fill={PAINT.kingyo.glass} {...S} />
          <g clipPath={`url(#${id}-bowl)`}>
            <rect x="0" y="34" width="80" height="60" fill={PAINT.kingyo.water} />
            <path d="M30 82 c-4 -12 4 -18 0 -30 M50 82 c4 -10 -4 -16 2 -26" fill="none" stroke={PAINT.kingyo.weed} strokeWidth="3" strokeLinecap="round" />
            <motion.g
              initial={{ x: 0 }}
              animate={animate ? { x: [-8, 10, -8], scaleX: [1, 1, -1, -1, 1] } : undefined}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "40px 56px", transformBox: "view-box" }}
            >
              <path d="M30 56 q10 -10 20 0 q-10 10 -20 0Z" fill={PAINT.kingyo.fish} {...S} strokeWidth={1.1} />
              <path d="M50 56 l8 -7 l-2 7 l2 7Z" fill={PAINT.kingyo.fin} {...S} strokeWidth={1.1} />
              <circle cx="35" cy="54" r="1.4" fill={INK} />
            </motion.g>
          </g>
          <ellipse cx="40" cy="22" rx="18" ry="4" fill={LIGHT} fillOpacity="0.6" {...S} strokeWidth={1.3} />
          <path d="M22 40 q-4 10 0 22" fill="none" stroke={LIGHT} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        </g>
      );
    case "halloween.pumpkin": {
      const face = lit ? PAINT.pumpkin.glow : PAINT.pumpkin.face;
      return (
        <g>
          {lit && <ellipse cx="38" cy="40" rx="40" ry="30" fill={PAINT.pumpkin.glow} opacity="0.25" />}
          <path d="M38 14 C30 4 26 4 24 6" fill="none" stroke={PAINT.pumpkin.stem} strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="22" cy="40" rx="18" ry="23" fill={PAINT.pumpkin.rib} {...S} />
          <ellipse cx="54" cy="40" rx="18" ry="23" fill={PAINT.pumpkin.rib} {...S} />
          <ellipse cx="38" cy="40" rx="22" ry="24" fill={PAINT.pumpkin.body} {...S} />
          <path d="M26 32 l7 6 h-10Z M50 32 l-7 6 h10Z" fill={face} />
          <path d="M24 48 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 q-14 10 -28 0Z" fill={face} />
          <path d="M38 16 v-6" stroke={PAINT.pumpkin.stem} strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    }
    case "halloween.ghost":
      return (
        <motion.g animate={animate ? { y: [0, -5, 0] } : undefined} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
          <path d="M8 74 V34 C8 14 20 4 32 4 C44 4 56 14 56 34 V74 l-8 -6 l-8 6 l-8 -6 l-8 6 l-8 -6Z" fill={PAINT.ghost.body} {...S} />
          <path d="M14 36 C14 20 22 12 30 10" fill="none" stroke={PAINT.ghost.shade} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="24" cy="36" rx="3.4" ry="4.4" fill={PAINT.ghost.eye} />
          <ellipse cx="40" cy="36" rx="3.4" ry="4.4" fill={PAINT.ghost.eye} />
          <circle cx="25" cy="34.5" r="1" fill={LIGHT} />
          <circle cx="41" cy="34.5" r="1" fill={LIGHT} />
          <ellipse cx="18" cy="44" rx="4" ry="2.4" fill={PAINT.ghost.cheek} />
          <ellipse cx="46" cy="44" rx="4" ry="2.4" fill={PAINT.ghost.cheek} />
          <path d="M28 46 q4 4 8 0" fill="none" stroke={PAINT.ghost.eye} strokeWidth="1.6" strokeLinecap="round" />
        </motion.g>
      );
    case "xmas.tree": {
      const T = PAINT.xmasTree;
      const lights = [[44, 62], [74, 70], [58, 96], [34, 108], [86, 112], [60, 134], [26, 146], [96, 146], [48, 150], [74, 152]];
      return (
        <g>
          <rect x="52" y="156" width="16" height="12" fill={T.trunk} {...S} />
          <path d="M36 166 h48 l-4 10 h-40Z" fill={PAINT.gifts.a} {...S} />
          <path d="M60 104 L112 160 H8Z" fill={T.leafDeep} {...S} />
          <path d="M60 64 L100 120 H20Z" fill={T.leaf} {...S} />
          <path d="M60 22 L90 80 H30Z" fill={T.leafDeep} {...S} />
          <path d="M30 80 Q60 92 90 80 M20 120 Q60 134 100 120" fill="none" stroke={PAINT.gifts.ribbon} strokeWidth="2.2" />
          {lights.map(([x, y], i) => (
            <motion.circle
              key={i}
              cx={x}
              cy={y}
              r="3.6"
              fill={T.lights[i % T.lights.length]}
              stroke={INK}
              strokeWidth="0.8"
              animate={animate ? { opacity: [1, 0.35, 1] } : undefined}
              transition={{ duration: 1.4, delay: (i % 4) * 0.35, repeat: Infinity }}
              style={lit ? { filter: `drop-shadow(0 0 3px ${T.lightGlow})` } : undefined}
            />
          ))}
          <path d={starPath(60, 18, 13)} fill={T.star} {...S} />
        </g>
      );
    }
    case "xmas.gifts": {
      const G = PAINT.gifts;
      return (
        <g>
          <rect x="8" y="16" width="44" height="44" rx="3" fill={G.a} {...S} />
          <rect x="4" y="10" width="52" height="10" rx="3" fill={G.a} {...S} />
          <rect x="26" y="10" width="8" height="50" fill={G.ribbon} />
          <path d="M30 10 c-10 -12 -18 -2 0 0 c10 -12 18 -2 0 0Z" fill={G.ribbon} {...S} strokeWidth={1.2} />
          <rect x="58" y="30" width="38" height="30" rx="3" fill={G.b} {...S} />
          <rect x="74" y="30" width="6" height="30" fill={G.ribbon} />
          <rect x="58" y="42" width="38" height="6" fill={G.ribbon} />
          <rect x="64" y="20" width="22" height="12" rx="2" fill={G.c} {...S} strokeWidth={1.2} />
        </g>
      );
    }
    case "yumekawa.cloud": {
      const C = PAINT.cloud;
      return (
        <g>
          <path d="M28 80 v4 M142 80 v4" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path
            d="M12 80 C2 80 0 62 12 56 C2 44 16 26 34 34 C38 14 64 10 74 26 C86 8 116 12 118 32 C136 22 160 34 154 52 C170 58 168 80 152 80Z"
            fill={C.body}
            {...S}
          />
          <path d="M26 46 C40 42 130 42 146 46 C150 50 150 56 146 58 H26 C20 56 20 50 26 46Z" fill={C.shade} />
          <path d="M28 60 h116" stroke={C.shade} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="52" cy="70" rx="6" ry="3" fill={C.cheek} />
          <ellipse cx="118" cy="70" rx="6" ry="3" fill={C.cheek} />
          <path d="M78 68 q7 6 14 0" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
          <path d={sparklePath(40, 24, 4)} fill={PAINT.cloud.star} />
        </g>
      );
    }
    case "yumekawa.moon": {
      const M = PAINT.moon;
      return (
        <Sway ox={35} oy={0} deg={3} dur={4} animate={animate}>
          {lit && <circle cx="38" cy="44" r="34" fill={M.body} opacity="0.3" />}
          <line x1="40" y1="0" x2="40" y2="14" stroke={M.string} strokeWidth="1.4" />
          <path d="M44 14 C20 14 10 36 14 52 C20 72 46 80 62 66 C42 66 30 52 32 38 C34 26 40 18 44 14Z" fill={M.body} {...S} />
          <path d="M22 44 q3 3 6 0" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
          <ellipse cx="24" cy="52" rx="3.4" ry="2" fill={M.cheek} />
          <path d="M22 58 q4 3 8 0" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="58" y1="20" x2="58" y2="44" stroke={M.string} strokeWidth="1" />
          <path d={starPath(58, 48, 6)} fill={M.shade} {...S} strokeWidth={1} />
        </Sway>
      );
    }
    case "showcase.case": {
      const C = PAINT.showcase;
      return (
        <g>
          <rect x="4" y="8" width="112" height="182" fill={C.glass} {...S} />
          <rect x="10" y="98" width="100" height="5" fill={C.shelf} {...S} strokeWidth={1} />
          <rect x="0" y="188" width="120" height="12" rx="2" fill={C.base} {...S} />
          <rect x="0" y="0" width="120" height="10" rx="3" fill={C.frame} {...S} />
          <rect x="2" y="8" width="5" height="182" fill={C.frame} />
          <rect x="113" y="8" width="5" height="182" fill={C.frame} />
          <path d="M18 24 l22 -12 M18 40 l36 -20 M86 150 l18 -10" stroke={LIGHT} strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
          <rect x="12" y="192" width="96" height="3" fill={C.frameDeep} />
        </g>
      );
    }
    case "showcase.pedestal": {
      const P = PAINT.pedestal;
      return (
        <g>
          <path d={`M30 -150 L50 -150 L80 6 L0 6Z`} fill={`url(#${id}-beam)`} opacity={lit ? 1 : 0.7} />
          <defs>
            <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={PAINT.beam} stopOpacity="0" />
              <stop offset="1" stopColor={PAINT.beam} stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <rect x="0" y="4" width="80" height="12" rx="3" fill={P.body} {...S} />
          <rect x="2" y="12" width="76" height="3" fill={P.gold} />
          <path d="M14 16 h52 l-4 60 h-44Z" fill={P.body} {...S} />
          <path d="M28 18 v56 M40 18 v56 M52 18 v56" stroke={P.shade} strokeWidth="2" />
          <rect x="6" y="76" width="68" height="16" rx="3" fill={P.body} {...S} />
          <rect x="6" y="78" width="68" height="3" fill={P.gold} />
        </g>
      );
    }
    case "library.bookcase": {
      const B = PAINT.library.books;
      // 本の背（幅と高さを少しずつ変えて、手で並べた感じに）
      const books = (x0: number, x1: number, bottom: number, room: number, seed: number) => {
        const out: React.ReactNode[] = [];
        let x = x0;
        let i = seed;
        while (x < x1 - 6) {
          const w = [9, 7, 11, 8, 10, 7, 9, 12][i % 8];
          const h = room - [4, 10, 2, 8, 6, 12, 3, 7][(i * 3) % 8];
          if (x + w > x1) break;
          out.push(
            <g key={`${seed}-${i}`}>
              <rect x={x} y={bottom - h} width={w} height={h} rx="1.2" fill={B[i % B.length]} stroke={INK} strokeWidth="1" />
              <path d={`M${x + 1.5} ${bottom - h + 5} h${w - 3} M${x + 1.5} ${bottom - 7} h${w - 3}`} stroke={LIGHT} strokeOpacity="0.45" strokeWidth="1" />
            </g>
          );
          x += w + 0.5;
          i++;
        }
        return out;
      };
      return (
        <g>
          <rect x="2" y="0" width="116" height="190" rx="5" fill={W.dark} {...S} />
          <rect x="8" y="10" width="104" height="56" fill={W.deep} opacity="0.55" />
          <rect x="8" y="72" width="104" height="54" fill={W.deep} opacity="0.55" />
          <rect x="8" y="132" width="104" height="48" fill={W.deep} opacity="0.55" />
          {books(10, 110, 66, 50, 0)}
          {books(10, 58, 126, 48, 3)}
          {/* 下の段の右に、寝かせた本 */}
          <rect x="90" y="172" width="22" height="8" rx="1.2" fill={B[2]} stroke={INK} strokeWidth="1" />
          <rect x="92" y="164" width="18" height="8" rx="1.2" fill={B[4]} stroke={INK} strokeWidth="1" />
          <rect x="0" y="0" width="120" height="10" rx="4" fill={W.mid} {...S} />
          <rect x="5" y="66" width="110" height="6" rx="2" fill={W.mid} {...S} strokeWidth={1.3} />
          <rect x="5" y="126" width="110" height="6" rx="2" fill={W.mid} {...S} strokeWidth={1.3} />
          <rect x="5" y="180" width="110" height="8" rx="2" fill={W.mid} {...S} strokeWidth={1.3} />
          <path d="M6 4 h70" stroke={LIGHT} strokeOpacity="0.4" strokeWidth="2" />
        </g>
      );
    }
    case "library.globe": {
      const G = PAINT.globe;
      return (
        <g>
          <defs>
            <clipPath id={`${id}-globe`}>
              <circle cx="30" cy="36" r="22" />
            </clipPath>
          </defs>
          <ellipse cx="30" cy="91" rx="18" ry="4.4" fill={G.brass} {...S} />
          <rect x="27.5" y="60" width="5" height="30" fill={G.brassDeep} {...S} strokeWidth={1.2} />
          <circle cx="30" cy="36" r="22" fill={G.sea} {...S} />
          <g clipPath={`url(#${id}-globe)`}>
            <motion.g animate={animate ? { x: [-10, 10, -10] } : undefined} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}>
              <path d="M10 26 q8 -8 16 -2 q4 6 -2 10 q-6 2 -6 8 q-4 4 -8 -2Z M34 20 q10 -4 16 4 q-2 8 -10 8 q-4 6 -8 2 q2 -8 2 -14Z M28 48 q8 -2 10 6 q-4 6 -10 2Z M-10 40 q8 -6 14 0 q-2 8 -10 6Z M58 44 q8 -4 12 4 q-6 6 -12 0Z" fill={G.land} stroke={G.landDeep} strokeWidth="1" />
            </motion.g>
          </g>
          <path d="M24 22 q-8 4 -10 14" fill="none" stroke={LIGHT} strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
          <path d="M8 52 A26 26 0 0 1 50 14" fill="none" stroke={G.brass} strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="30" cy="62" r="3" fill={G.brass} {...S} strokeWidth={1.1} />
        </g>
      );
    }
    case "cafe.counter": {
      const C = PAINT.cafe;
      return (
        <g>
          {/* コーヒーマシン（天板の左はし） */}
          <rect x="8" y="10" width="32" height="38" rx="4" fill={C.steel} {...S} />
          <rect x="12" y="14" width="24" height="8" rx="2" fill={C.steelDeep} />
          <circle cx="16" cy="18" r="1.6" fill={PAINT.lamp.bulb} />
          <rect x="20" y="24" width="8" height="6" fill={C.steelDeep} {...S} strokeWidth={1} />
          <path d="M19 38 h10 v6 q-5 3 -10 0Z" fill={PAINT.cup} {...S} strokeWidth={1} />
          {animate && (
            <motion.path
              d="M22 34 q-2 -4 0 -8 M26 34 q2 -4 0 -8"
              fill="none"
              stroke={LIGHT}
              strokeWidth="1.4"
              strokeLinecap="round"
              animate={{ opacity: [0, 0.8, 0], y: [2, -4, -8] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            />
          )}
          {/* カウンター */}
          <rect x="6" y="54" width="148" height="78" fill={C.panel} {...S} />
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d={`M${16 + i * 18} 60 v66`} stroke={C.panelDeep} strokeWidth="2" />
          ))}
          <rect x="0" y="46" width="160" height="10" rx="3" fill={W.light} {...S} />
          <path d="M6 49 h80" stroke={LIGHT} strokeOpacity="0.5" strokeWidth="2" />
          <rect x="6" y="132" width="148" height="8" fill={W.deep} {...S} strokeWidth={1.2} />
          {/* 前の小さな黒板 */}
          <rect x="110" y="70" width="34" height="26" rx="2" fill={C.sign} stroke={W.dark} strokeWidth="2.4" />
          <path d={heartPath(119, 82, 3.4)} fill={PAINT.frame.chalk.chalkPink} />
          <path d="M126 80 h12 M126 86 h9" stroke={LIGHT} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
        </g>
      );
    }
    case "cafe.sweets": {
      const Sw = PAINT.sweets;
      return (
        <g>
          <rect x="33" y="8" width="4" height="58" fill={Sw.gold} {...S} strokeWidth={1.1} />
          {/* 下の皿: いちごのショートケーキとマカロン */}
          <path d="M8 62 l16 -8 v10 h-16Z" fill={Sw.cream} {...S} strokeWidth={1.1} />
          <path d="M8 58 l16 -8 v4 l-16 8Z" fill={Sw.sponge} stroke={INK} strokeWidth="0.8" />
          <circle cx="18" cy="50" r="3.4" fill={Sw.berry} {...S} strokeWidth={1} />
          {Sw.macaron.slice(0, 3).map((c, i) => (
            <g key={i}>
              <ellipse cx={46 + i * 7} cy={60 - (i % 2) * 3} rx="5" ry="2.4" fill={c} {...S} strokeWidth={1} />
              <ellipse cx={46 + i * 7} cy={57 - (i % 2) * 3} rx="5" ry="2.4" fill={c} {...S} strokeWidth={1} />
            </g>
          ))}
          <ellipse cx="35" cy="66" rx="33" ry="5" fill={Sw.plate} {...S} />
          <path d="M14 68 q21 6 42 0" fill="none" stroke={Sw.gold} strokeWidth="1.4" />
          {/* 上の皿（グッズを置ける） */}
          <ellipse cx="35" cy="8" rx="23" ry="4" fill={Sw.plate} {...S} />
          <path d="M16 9 q19 4 38 0" fill="none" stroke={Sw.gold} strokeWidth="1.2" />
        </g>
      );
    }
    case "space.rocket": {
      const R = PAINT.rocket;
      return (
        <g>
          <rect x="4" y="136" width="62" height="14" rx="3" fill={PAINT.cafe.steel} {...S} />
          <path d="M10 140 h50" stroke={PAINT.cafe.steelDeep} strokeWidth="2" />
          <path d="M18 98 L4 132 L20 128Z" fill={R.fin} {...S} />
          <path d="M52 98 L66 132 L50 128Z" fill={R.fin} {...S} />
          <path d="M35 4 C56 24 58 70 52 128 H18 C12 70 14 24 35 4Z" fill={R.body} {...S} />
          <path d="M22 40 C20 70 20 100 22 124" fill="none" stroke={R.shade} strokeWidth="5" strokeLinecap="round" />
          <path d="M35 4 C44 12 49 20 51 30 H19 C21 20 26 12 35 4Z" fill={R.fin} {...S} />
          <rect x="16" y="96" width="38" height="8" fill={R.finDeep} />
          <circle cx="35" cy="58" r="12" fill={R.shade} {...S} />
          <circle cx="35" cy="58" r="8" fill={lit ? PAINT.lamp.bulb : R.window} stroke={INK} strokeWidth="1.2" />
          <path d="M31 54 q2 -3 6 -2" fill="none" stroke={LIGHT} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M35 128 v8" stroke={INK} strokeWidth="1.2" />
          <path d={starPath(35, 112, 5)} fill={PAINT.gifts.ribbon} stroke={INK} strokeWidth="0.8" />
        </g>
      );
    }
    case "space.planet": {
      const P = PAINT.saturn;
      return (
        <Sway ox={55} oy={0} deg={2.5} dur={4.6} animate={animate}>
          {lit && <circle cx="55" cy="46" r="38" fill={P.body} opacity="0.3" />}
          <line x1="55" y1="0" x2="55" y2="20" stroke={P.chain} strokeWidth="1.6" strokeDasharray="3 2" />
          {/* 輪の奥半分 → 星 → 手前半分 */}
          <path d="M6 48 A49 12 0 0 1 104 48" fill="none" stroke={P.ringDeep} strokeWidth="5" strokeLinecap="round" />
          <circle cx="55" cy="46" r="26" fill={lit ? PAINT.lamp.bulb : P.body} {...S} />
          <path d="M32 38 q23 8 46 0 M30 52 q25 7 50 0" fill="none" stroke={P.band} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M40 30 q6 -6 14 -6" fill="none" stroke={LIGHT} strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
          <path d="M6 48 A49 12 0 0 0 104 48" fill="none" stroke={P.ring} strokeWidth="5" strokeLinecap="round" />
          <path d="M6 48 A49 12 0 0 0 104 48" fill="none" stroke={INK} strokeWidth="1" opacity="0.5" />
          <circle cx="98" cy="18" r="5" fill={PAINT.moon.body} stroke={INK} strokeWidth="1.1" />
        </Sway>
      );
    }
    case "beach.parasol": {
      const P = PAINT.parasol;
      const xs = [4, 24.3, 44.6, 65, 85.3, 105.6, 126];
      return (
        <g>
          <ellipse cx="65" cy="166" rx="18" ry="4" fill={PAINT.floor["beach.floor"].line} />
          <rect x="63" y="16" width="4" height="150" fill={P.pole} {...S} strokeWidth={1.2} />
          <Sway ox={65} oy={160} deg={1.2} dur={5} animate={animate}>
            {xs.slice(0, -1).map((x, i) => (
              <path key={i} d={`M65 14 L${x} 56 Q${(x + xs[i + 1]) / 2} 64 ${xs[i + 1]} 56Z`} fill={i % 2 ? P.b : P.a} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
            ))}
            <path d="M65 14 C44 18 20 34 4 56" fill="none" stroke={INK} strokeWidth="1.4" />
            <path d="M65 14 C86 18 110 34 126 56" fill="none" stroke={INK} strokeWidth="1.4" />
            <circle cx="65" cy="12" r="4" fill={P.top} {...S} strokeWidth={1.2} />
          </Sway>
        </g>
      );
    }
    case "beach.float": {
      const F = PAINT.float;
      return (
        <g>
          <rect x="31" y="0" width="8" height="5" rx="2" fill={F.hook} {...S} strokeWidth={1.1} />
          <path d="M35 4 L20 22 M35 4 L50 22" stroke={F.rope} strokeWidth="1.8" strokeLinecap="round" />
          <Sway ox={35} oy={4} deg={3} dur={3.8} animate={animate}>
            <circle cx="35" cy="44" r="21" fill="none" stroke={F.a} strokeWidth="16" />
            <circle cx="35" cy="44" r="21" fill="none" stroke={F.b} strokeWidth="16" strokeDasharray="16.5 16.5" />
            <circle cx="35" cy="44" r="29" fill="none" stroke={INK} strokeWidth="1.6" />
            <circle cx="35" cy="44" r="13" fill="none" stroke={INK} strokeWidth="1.6" />
            <path d="M18 34 A20 20 0 0 1 30 24" fill="none" stroke={LIGHT} strokeWidth="2.6" strokeLinecap="round" opacity="0.8" />
          </Sway>
        </g>
      );
    }
    case "live.speaker": {
      const Sp = PAINT.speaker;
      const cone = (cy: number, r: number, i: number) => (
        <motion.g
          style={{ transformOrigin: `35px ${cy}px`, transformBox: "view-box" }}
          animate={animate ? { scale: [1, 1.06, 1] } : undefined}
          transition={{ duration: 0.5, delay: i * 0.25, repeat: Infinity, repeatDelay: 0.3 }}
        >
          <circle cx="35" cy={cy} r={r} fill={Sp.rim} {...S} />
          <circle cx="35" cy={cy} r={r * 0.68} fill={Sp.cone} />
          <circle cx="35" cy={cy} r={r * 0.24} fill={Sp.rim} />
        </motion.g>
      );
      return (
        <g>
          <rect x="2" y="2" width="66" height="104" rx="5" fill={Sp.body} {...S} />
          <rect x="7" y="7" width="56" height="94" rx="3" fill={Sp.grille} />
          {cone(34, 14, 0)}
          {cone(76, 21, 1)}
          <circle cx="57" cy="13" r="2.4" fill={Sp.led} />
          <rect x="6" y="104" width="12" height="5" fill={Sp.body} {...S} strokeWidth={1} />
          <rect x="52" y="104" width="12" height="5" fill={Sp.body} {...S} strokeWidth={1} />
          <path d="M8 6 h40" stroke={LIGHT} strokeOpacity="0.2" strokeWidth="2" />
        </g>
      );
    }
    case "live.mic": {
      const M = PAINT.mic;
      return (
        <g>
          <path d="M25 118 L8 146 M25 118 L42 146 M25 118 V146" fill="none" stroke={M.stand} strokeWidth="3.4" strokeLinecap="round" />
          <ellipse cx="25" cy="147" rx="18" ry="2.6" fill={M.stand} opacity="0.5" />
          <rect x="23.5" y="34" width="3" height="86" fill={M.stand} {...S} strokeWidth={1} />
          <rect x="20" y="30" width="10" height="6" rx="1.5" fill={M.stand} {...S} strokeWidth={1} />
          <rect x="21" y="22" width="8" height="12" rx="2" fill={M.grip} {...S} strokeWidth={1.1} />
          <ellipse cx="25" cy="14" rx="9" ry="11" fill={lit ? PAINT.lamp.bulb : M.head} {...S} />
          <path d="M17 10 h16 M16.5 15 h17 M18 20 h14 M25 3.5 v21" stroke={M.headDeep} strokeWidth="1" />
          <path d="M20 8 q2 -3 5 -3" fill="none" stroke={LIGHT} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    }
    case "live.fans": {
      // 応援うちわ2枚（推し色にハート・金に星）を、ばってんに飾る
      const o = oshiPaint(oshi);
      const F = PAINT.fans;
      const fan = (cx: number, deg: number, face: string, mark: React.ReactNode, i: number) => (
        <Sway ox={cx} oy={82} deg={2} dur={3 + i * 0.5} animate={animate}>
          <g transform={`rotate(${deg} ${cx} 82)`}>
            <rect x={cx - 3} y="46" width="6" height="36" rx="2.5" fill={F.handle} {...S} strokeWidth={1.2} />
            <circle cx={cx} cy="32" r="30" fill={face} {...S} />
            <circle cx={cx} cy="32" r="25" fill="none" stroke={LIGHT} strokeWidth="2.4" strokeDasharray="4 3" />
            {mark}
          </g>
        </Sway>
      );
      return (
        <g>
          {fan(56, -16, o.base, <path d={heartPath(56, 34, 15)} fill={LIGHT} stroke={INK} strokeWidth="1.2" />, 0)}
          {fan(104, 16, F.second, <path d={starPath(104, 33, 17)} fill={o.base} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />, 1)}
          <path d={sparklePath(80, 10, 6)} fill={F.second} stroke={INK} strokeWidth="0.8" />
        </g>
      );
    }
    case "altar.stand": {
      // ひな壇（3段）。推し色の布に、白いレースのふち
      const o = oshiPaint(oshi);
      const tier = (x: number, y: number, w: number, h: number) => (
        <g>
          <rect x={x} y={y} width={w} height={h} fill={o.base} {...S} />
          <rect x={x} y={y} width={w} height="4" fill={o.light} {...S} strokeWidth={1.1} />
          <path
            d={`M${x + 2} ${y + 4} ${Array.from({ length: Math.floor((w - 4) / 8) }, () => "q4 6 8 0").join(" ")}`}
            fill={PAINT.altar.lace}
            stroke={INK}
            strokeWidth="0.8"
          />
          <path d={`M${x + 4} ${y + h - 5} h${w - 8}`} stroke={o.deep} strokeWidth="1.6" opacity="0.6" />
        </g>
      );
      return (
        <g>
          {tier(52, 4, 66, 36)}
          {tier(28, 40, 114, 36)}
          {tier(6, 76, 158, 32)}
          <rect x="4" y="106" width="162" height="4" rx="1.5" fill={PAINT.altar.gold} {...S} strokeWidth={1} />
        </g>
      );
    }
    case "altar.balloon": {
      // 推し色のハートのバルーン。重りから糸がのびて、ふわふわ揺れる
      const o = oshiPaint(oshi);
      const balloons = [
        { x: 26, y: 40, s: 20, c: o.base, d: 0 },
        { x: 64, y: 30, s: 20, c: o.mid, d: 0.6 },
        { x: 46, y: 66, s: 16, c: LIGHT, d: 1.1 },
      ];
      return (
        <g>
          {balloons.map((b, i) => (
            <path key={`s${i}`} d={`M45 124 Q${(45 + b.x) / 2 + (i - 1) * 6} ${(124 + b.y) / 2 + 20} ${b.x} ${b.y + b.s * 0.8}`} fill="none" stroke={INK} strokeWidth="1" opacity="0.7" />
          ))}
          {balloons.map((b, i) => (
            <motion.g key={i} animate={animate ? { y: [0, -4, 0], rotate: [-2, 2, -2] } : undefined} transition={{ duration: 3.2, delay: b.d, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: `${b.x}px ${b.y + b.s}px`, transformBox: "view-box" }}>
              <path d={heartPath(b.x, b.y, b.s)} fill={b.c} {...S} />
              <path d={`M${b.x - b.s * 0.55} ${b.y - b.s * 0.3} q2 -6 8 -6`} fill="none" stroke={LIGHT} strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
              <path d={`M${b.x - 2} ${b.y + b.s * 0.8} l2 3 l2 -3Z`} fill={b.c} stroke={INK} strokeWidth="0.8" />
            </motion.g>
          ))}
          <rect x="36" y="122" width="18" height="16" rx="3" fill={o.deep} {...S} />
          <path d="M45 122 c-6 -6 -10 0 0 0 c6 -6 10 0 0 0Z" fill={PAINT.altar.gold} stroke={INK} strokeWidth="1" />
        </g>
      );
    }
    case "altar.flower": {
      // フラワースタンド（推しに贈る花）。推し色の花の丸い飾りに、リボン
      const o = oshiPaint(oshi);
      const A = PAINT.altar;
      const flowers = [
        [42, 22, o.base], [24, 36, o.mid], [60, 36, o.mid], [16, 56, o.base], [68, 56, o.base],
        [42, 46, LIGHT], [28, 72, o.light], [56, 72, o.light], [42, 80, o.base], [32, 54, o.base], [52, 54, o.base],
      ] as const;
      return (
        <g>
          <path d="M24 168 L38 92 M60 168 L46 92 M42 168 V96" fill="none" stroke={A.easelDeep} strokeWidth="4" strokeLinecap="round" />
          <path d="M28 140 h28" stroke={A.easelDeep} strokeWidth="3" strokeLinecap="round" />
          <circle cx="42" cy="52" r="38" fill={A.leaf} {...S} />
          {[[12, 40], [70, 70], [20, 78], [66, 26]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y} q6 -8 12 0 q-6 6 -12 0Z`} fill={A.leafDeep} />
          ))}
          {flowers.map(([x, y, c], i) => (
            <g key={i}>
              {[0, 72, 144, 216, 288].map((d) => (
                <circle key={d} cx={x + Math.cos((d * Math.PI) / 180) * 5} cy={y + Math.sin((d * Math.PI) / 180) * 5} r="4.6" fill={c} stroke={INK} strokeWidth="0.8" />
              ))}
              <circle cx={x} cy={y} r="2.6" fill={A.gold} />
            </g>
          ))}
          <path d="M36 86 L28 132 L33 128 L36 134Z M48 86 L56 132 L51 128 L48 134Z" fill={o.deep} {...S} strokeWidth={1.2} />
          <rect x="31" y="84" width="22" height="13" rx="2" fill={LIGHT} {...S} strokeWidth={1.2} />
          <path d={heartPath(42, 90, 4)} fill={o.base} />
        </g>
      );
    }
    case "retro.arcade": {
      const R = PAINT.retro;
      return (
        <g>
          <path d="M6 0 H74 V42 L78 74 V170 H2 V74 L6 42Z" fill={R.side} {...S} />
          <path d="M10 4 H70 V42 L74 74 V166 H6 V74 L10 42Z" fill={R.body} />
          <rect x="10" y="4" width="60" height="18" rx="2" fill={R.marquee} {...S} strokeWidth={1.2} />
          {pixelCells(PIXEL_HEART, 29, 7, 2).map((c, i) => (
            <rect key={i} x={c.x} y={c.y} width={c.s} height={c.s} fill={LIGHT} />
          ))}
          {pixelCells(PIXEL_STAR, 45, 7, 2).map((c, i) => (
            <rect key={`s${i}`} x={c.x} y={c.y} width={c.s} height={c.s} fill={PAINT.gifts.ribbon} />
          ))}
          <rect x="12" y="28" width="56" height="46" rx="4" fill={INK} />
          <rect x="16" y="32" width="48" height="38" rx="3" fill={R.screen} />
          {/* 画面: ドットのハートが左右に動く */}
          <motion.g animate={animate ? { x: [-12, 12, -12] } : undefined} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
            {pixelCells(PIXEL_HEART, 33, 44, 2).map((c, i) => (
              <rect key={i} x={c.x} y={c.y} width={c.s} height={c.s} fill={lit || animate ? R.glow : R.buttons[0]} />
            ))}
          </motion.g>
          <path d="M18 64 h44" stroke={R.glow} strokeWidth="1.4" opacity="0.6" />
          <path d="M4 80 H76 L72 100 H8Z" fill={R.side} {...S} />
          <line x1="20" y1="86" x2="20" y2="76" stroke={INK} strokeWidth="2" />
          <circle cx="20" cy="75" r="4" fill={R.buttons[0]} {...S} strokeWidth={1.1} />
          {R.buttons.map((c, i) => (
            <circle key={i} cx={42 + i * 10} cy={88} r="3.6" fill={c} {...S} strokeWidth={1.1} />
          ))}
          <rect x="30" y="116" width="20" height="24" rx="2" fill={R.side} {...S} strokeWidth={1.2} />
          <rect x="37" y="122" width="6" height="2" fill={PAINT.gifts.ribbon} />
          <rect x="37" y="130" width="6" height="2" fill={PAINT.gifts.ribbon} />
        </g>
      );
    }
    case "retro.tv": {
      const C = PAINT.crt;
      return (
        <g>
          <rect x="4" y="72" width="102" height="36" rx="3" fill={W.mid} {...S} />
          <rect x="10" y="80" width="42" height="22" rx="2" fill={W.dark} opacity="0.6" />
          <rect x="16" y="84" width="30" height="12" rx="2" fill={C.console} {...S} strokeWidth={1.1} />
          <rect x="20" y="88" width="10" height="3" rx="1" fill={C.consoleDeep} />
          <circle cx="38" cy="90" r="2" fill={PAINT.retro.buttons[0]} />
          <path d="M46 90 q12 0 16 8" fill="none" stroke={INK} strokeWidth="1.2" />
          <rect x="60" y="94" width="18" height="9" rx="4" fill={C.console} {...S} strokeWidth={1.1} />
          <rect x="12" y="4" width="86" height="68" rx="10" fill={C.body} {...S} />
          <rect x="18" y="10" width="58" height="52" rx="9" fill={INK} />
          <rect x="21" y="13" width="52" height="46" rx="8" fill={C.screen} />
          {[20, 28, 36, 44, 52].map((y) => (
            <path key={y} d={`M24 ${y} h46`} stroke={C.glow} strokeWidth="0.8" opacity="0.18" />
          ))}
          <motion.g animate={animate ? { opacity: [1, 0.4, 1] } : undefined} transition={{ duration: 1.6, repeat: Infinity }}>
            {pixelCells(PIXEL_STAR, 40, 27, 2).map((c, i) => (
              <rect key={i} x={c.x} y={c.y} width={c.s} height={c.s} fill={lit || animate ? C.glow : PAINT.retro.marquee} />
            ))}
          </motion.g>
          <path d="M26 18 q4 -3 10 -3" fill="none" stroke={LIGHT} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          <circle cx="87" cy="22" r="4.4" fill={C.knob} {...S} strokeWidth={1.1} />
          <circle cx="87" cy="36" r="4.4" fill={C.knob} {...S} strokeWidth={1.1} />
          <path d="M82 50 h10 M82 54 h10" stroke={C.bodyShade} strokeWidth="1.6" />
        </g>
      );
    }
    case "lv3.cushion": {
      // なかよし Lv3 の特典: ハートのクッション（上にグッズを座らせられる）
      const C = PAINT.cushion;
      return (
        <g>
          <g transform="translate(0 6) scale(1 0.82)">
            <path d={heartPath(46, 26, 40)} fill={C.body} {...S} />
            <path d={heartPath(46, 26, 32)} fill="none" stroke={C.stitch} strokeWidth="1.6" strokeDasharray="3 3" />
          </g>
          <path d="M20 14 q6 -4 12 -2" fill="none" stroke={LIGHT} strokeWidth="2.6" strokeLinecap="round" opacity="0.7" />
          {[[8, 20], [84, 20]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="3" fill={C.tassel} {...S} strokeWidth={1} />
              <path d={`M${x} ${y + 3} l-2 6 M${x} ${y + 3} l0 7 M${x} ${y + 3} l2 6`} stroke={C.tassel} strokeWidth="1.4" strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
    }
    case "lv5.trophy": {
      // なかよし Lv5 の特典: ハートのトロフィー
      const T = PAINT.trophy;
      return (
        <g>
          <path d="M14 14 C2 14 2 32 16 34" fill="none" stroke={T.deep} strokeWidth="4" strokeLinecap="round" />
          <path d="M46 14 C58 14 58 32 44 34" fill="none" stroke={T.deep} strokeWidth="4" strokeLinecap="round" />
          <path d="M12 8 H48 C48 34 40 44 30 46 C20 44 12 34 12 8Z" fill={T.gold} {...S} />
          <path d="M18 14 C18 30 22 38 26 40" fill="none" stroke={T.light} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <path d={heartPath(30, 22, 8)} fill={T.heart} stroke={INK} strokeWidth="1.1" />
          <rect x="26" y="46" width="8" height="12" fill={T.deep} {...S} strokeWidth={1.2} />
          <rect x="16" y="58" width="28" height="8" rx="2" fill={T.gold} {...S} strokeWidth={1.3} />
          <rect x="10" y="66" width="40" height="24" rx="2" fill={T.base} {...S} />
          <rect x="18" y="72" width="24" height="10" rx="1.5" fill={T.light} stroke={T.deep} strokeWidth="1" />
          <path d="M23 77 h14" stroke={T.deep} strokeWidth="1.4" strokeLinecap="round" />
          {animate ? (
            <motion.path
              d={sparklePath(46, 6, 5)}
              fill={T.light}
              stroke={INK}
              strokeWidth="0.8"
              style={{ transformOrigin: "46px 6px", transformBox: "view-box" }}
              animate={{ scale: [0.3, 1.1, 0.3], rotate: [0, 90, 0] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            />
          ) : (
            <path d={sparklePath(46, 6, 5)} fill={T.light} stroke={INK} strokeWidth="0.8" />
          )}
        </g>
      );
    }
    case "lv7.chandelier": {
      // なかよし Lv7 の特典: 金のシャンデリア（夜は灯る）
      const C = PAINT.chandelier;
      const candles = [14, 36, 84, 106];
      return (
        <Sway ox={60} oy={0} deg={1.5} dur={5} animate={animate}>
          <line x1="60" y1="0" x2="60" y2="24" stroke={C.deep} strokeWidth="2" />
          <path d="M14 52 C20 70 46 72 60 60 C74 72 100 70 106 52 M36 48 C40 62 52 62 60 56 C68 62 80 62 84 48" fill="none" stroke={C.gold} strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="60" cy="40" rx="12" ry="18" fill={C.gold} {...S} />
          <path d="M54 30 q2 -6 6 -6" fill="none" stroke={LIGHT} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          {candles.map((x, i) => {
            const y = i === 0 || i === 3 ? 52 : 48;
            return (
              <g key={x}>
                <rect x={x - 5} y={y - 2} width="10" height="4" rx="1.5" fill={C.gold} {...S} strokeWidth={1} />
                <rect x={x - 2.5} y={y - 14} width="5" height="12" fill={C.candle} {...S} strokeWidth={1} />
                <motion.path
                  d={`M${x} ${y - 24} q4 6 0 9 q-4 -3 0 -9Z`}
                  fill={C.flame}
                  stroke={INK}
                  strokeWidth="0.6"
                  style={{ transformOrigin: `${x}px ${y - 15}px`, transformBox: "view-box", filter: lit ? `drop-shadow(0 0 3px ${C.flame})` : undefined }}
                  animate={animate ? { scaleY: [1, 1.2, 0.9, 1] } : undefined}
                  transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                />
              </g>
            );
          })}
          {[24, 44, 60, 76, 96].map((x, i) => (
            <path key={x} d={`M${x} ${66 + (i % 2) * 6} l-3 8 l3 6 l3 -6Z`} fill={C.crystal} stroke={INK} strokeWidth="0.8" />
          ))}
        </Sway>
      );
    }
    case "lv10.arch": {
      // なかよし Lv10 の特典: 虹のアーチと雲。きらめきが行き来する
      const R = PAINT.rainbow;
      return (
        <g>
          {R.map((c, i) => (
            <path key={c} d={`M${12 + i * 10} 112 A${118 - i * 10} ${100 - i * 10} 0 0 1 ${248 - i * 10} 112`} fill="none" stroke={c} strokeWidth="10.5" />
          ))}
          <path d="M7 112 A123 105 0 0 1 253 112" fill="none" stroke={INK} strokeWidth="1.4" />
          <path d="M67 112 A63 45 0 0 1 193 112" fill="none" stroke={INK} strokeWidth="1.4" />
          <path d={cloudPath(-6, 120, 76)} fill={LIGHT} {...S} />
          <path d={cloudPath(190, 120, 76)} fill={LIGHT} {...S} />
          {[[70, 20], [130, 4], [196, 26]].map(([x, y], i) =>
            animate ? (
              <motion.path
                key={i}
                d={sparklePath(x, y, 7)}
                fill={PAINT.gifts.ribbon}
                stroke={INK}
                strokeWidth="0.8"
                style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" }}
                animate={{ scale: [0.3, 1.1, 0.3], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, delay: i * 0.6, repeat: Infinity }}
              />
            ) : (
              <path key={i} d={sparklePath(x, y, 7)} fill={PAINT.gifts.ribbon} stroke={INK} strokeWidth="0.8" />
            )
          )}
        </g>
      );
    }
    default:
      return <rect x="0" y="0" width="40" height="40" fill={PAINT.missing} {...S} />;
  }
}
