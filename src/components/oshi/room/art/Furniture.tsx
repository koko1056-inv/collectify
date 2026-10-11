import { useId } from "react";
import { motion } from "framer-motion";
import { FURNITURE_DEFS } from "@/lib/oshiRoom";
import type { OshiColor } from "@/lib/cosmetics";
import { INK, LIGHT, PAINT, oshiPaint } from "../palette";
import { heartPath, petalPath, sparklePath, starPath } from "./shapes";

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
    default:
      return <rect x="0" y="0" width="40" height="40" fill={PAINT.missing} {...S} />;
  }
}
