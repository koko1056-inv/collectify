import { createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ROOM_H, ROOM_W } from "@/lib/oshiRoom";
import { useLanguage } from "@/contexts/LanguageContext";
import { FX } from "./palette";
import type { RoomFxEvent } from "./fx";
import { CameraArt, ClothArt, CookieArt, GiftBoxArt, GiftLidArt, HandArt, HeartArt, SparkleArt, SpecialArt } from "./art/FxArt";

/**
 * お世話の演出（部屋の上に重ねる層）。
 *  - 撫でる: 手がグッズをなでなで → ハートがぽわっ
 *  - 磨く: クロスが左右に動いて、光の帯が走り、きらきらが残る
 *  - 撮る: カメラが出て、フラッシュとシャッター（そのあと撮影の画面へ）
 *  - プレゼント: 箱が出て、ふたが開き、おやつ／特別なプレゼントがグッズへ飛んでいく
 *  - どれも「+xp」の数字が浮く。レベルアップは部屋じゅうに紙吹雪と、称号のお祝い
 * 位置は部屋の単位で受け取り、% に直して置く（部屋の大きさが変わっても同じ所に出る）。
 * 動きを減らす設定では、手やクロスは動かさずにふわっと出して消すだけにし、紙吹雪は降らせない。
 */

export interface GoodsBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const L = (x: number) => `${(x / ROOM_W) * 100}%`;
const T = (y: number) => `${(y / ROOM_H) * 100}%`;
const WP = (u: number) => `${(u / ROOM_W) * 100}%`;
const HP = (u: number) => `${(u / ROOM_H) * 100}%`;

export function RoomFx({ events, boxes, reduceMotion }: { events: RoomFxEvent[]; boxes: Map<string, GoodsBox>; reduceMotion: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden="true">
      <AnimatePresence>
        {events.map((e) => {
          const box = e.item ? boxes.get(e.item) : undefined;
          if (e.kind === "levelup") return <LevelUpFx key={e.id} e={e} reduceMotion={reduceMotion} />;
          if (!box) return null;
          switch (e.kind) {
            case "pat":
              return <PatFx key={e.id} box={box} xp={e.xp} reduceMotion={reduceMotion} />;
            case "polish":
              return <PolishFx key={e.id} box={box} xp={e.xp} reduceMotion={reduceMotion} />;
            case "photo":
              return <PhotoFx key={e.id} box={box} reduceMotion={reduceMotion} />;
            case "photoDone":
              return <PhotoDoneFx key={e.id} box={box} xp={e.xp} reduceMotion={reduceMotion} />;
            case "gift":
              return <GiftFx key={e.id} box={box} xp={e.xp} gift={e.gift} reduceMotion={reduceMotion} />;
            default:
              return null;
          }
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * 演出の基準点（部屋の単位）。中身の Sized は、部屋の大きさに対する % で置く。
 * 以前は大きさ0の箱を基準にしていたが、% の幅が0になって絵が見えなかったので、部屋いっぱいの層にして点は文脈で渡す
 */
const AnchorContext = createContext<{ x: number; y: number }>({ x: 0, y: 0 });

function Anchor({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <AnchorContext.Provider value={{ x, y }}>
      <motion.div className="absolute inset-0" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
        {children}
      </motion.div>
    </AnchorContext.Provider>
  );
}

/** 大きさ（部屋の単位）の絵を、基準点を中心に置く。動き（x / y の %）は自分の大きさに対する割合 */
function Sized({ size, children, className, ...rest }: { size: number; children: React.ReactNode; className?: string } & React.ComponentProps<typeof motion.div>) {
  const { x, y } = useContext(AnchorContext);
  return (
    <motion.div className={`absolute ${className ?? ""}`} style={{ left: L(x - size / 2), top: T(y - size / 2), width: WP(size), height: HP(size) }} {...rest}>
      {children}
    </motion.div>
  );
}

/** 浮かぶ「+xp」 */
function XpPop({ box, xp, delay = 0.3 }: { box: GoodsBox; xp?: number; delay?: number }) {
  if (!xp) return null;
  return (
    <Anchor x={box.x + box.w * 0.42} y={box.y - box.h * 0.85}>
      <motion.span
        style={{ left: L(box.x + box.w * 0.42), top: T(box.y - box.h * 0.85) }}
        className="absolute whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-xs font-black tabular-nums text-primary-foreground shadow-md"
        initial={{ opacity: 0, x: "-50%", y: 6, scale: 0.6 }}
        animate={{ opacity: [0, 1, 1, 0], x: "-50%", y: [6, -10, -22, -34], scale: [0.6, 1.15, 1, 1] }}
        transition={{ duration: 1.3, delay, times: [0, 0.25, 0.7, 1] }}
      >
        +{xp}
      </motion.span>
    </Anchor>
  );
}

/** ハートがぽわっと上がる */
function Hearts({ box, delay, count = 4, reduceMotion }: { box: GoodsBox; delay: number; count?: number; reduceMotion: boolean }) {
  const size = Math.max(18, box.w * 0.42);
  return (
    <Anchor x={box.x} y={box.y - box.h * 0.75}>
      {Array.from({ length: count }, (_, i) => {
        const dx = (i - (count - 1) / 2) * 110;
        return (
          <Sized
            key={i}
            size={size * (i % 2 ? 0.75 : 1)}
            initial={{ opacity: 0, scale: 0.3, x: "0%", y: "0%" }}
            animate={
              reduceMotion
                ? { opacity: [0, 1, 0], scale: 1, x: `${dx}%`, y: "-60%" }
                : { opacity: [0, 1, 1, 0], scale: [0.3, 1.15, 1, 0.9], x: [`0%`, `${dx * 0.6}%`, `${dx}%`], y: ["0%", "-150%", `-${280 + (i % 2) * 80}%`] }
            }
            transition={{ duration: 1.1, delay: delay + i * 0.08, ease: "easeOut" }}
          >
            <HeartArt className="h-full w-full" color={i % 2 ? FX.heartLight : FX.heart} />
          </Sized>
        );
      })}
    </Anchor>
  );
}

function PatFx({ box, xp, reduceMotion }: { box: GoodsBox; xp?: number; reduceMotion: boolean }) {
  const hand = Math.max(52, box.w * 1.05);
  return (
    <>
      <Anchor x={box.x} y={box.y - box.h * 0.92}>
        <Sized
          size={hand}
          initial={{ opacity: 0, y: "-40%", rotate: -8 }}
          animate={
            reduceMotion
              ? { opacity: [0, 1, 1, 0], y: "-10%" }
              : { opacity: [0, 1, 1, 1, 1, 0], x: ["0%", "-22%", "22%", "-18%", "16%", "0%"], y: ["-40%", "-8%", "-4%", "-8%", "-4%", "-30%"], rotate: [-8, -14, 10, -12, 8, 0] }
          }
          transition={{ duration: 1.1, ease: "easeInOut" }}
        >
          <HandArt className="h-full w-full drop-shadow-sm" />
        </Sized>
      </Anchor>
      <Hearts box={box} delay={0.75} reduceMotion={reduceMotion} />
      <XpPop box={box} xp={xp} delay={0.8} />
    </>
  );
}

function SparkleBurst({ box, delay, count = 6, linger = 1.3, reduceMotion }: { box: GoodsBox; delay: number; count?: number; linger?: number; reduceMotion: boolean }) {
  // グッズの箱の中に、決まった散らばりで置く（毎回同じ所に出ると、手触りが機械的にならないよう少しずらす）
  const spots = [[-0.3, -0.75], [0.32, -0.55], [-0.12, -0.3], [0.38, -0.9], [-0.42, -0.4], [0.1, -0.62], [0.0, -1.0]];
  return (
    <>
      {spots.slice(0, count).map(([dx, dy], i) => (
        <Anchor key={i} x={box.x + dx * box.w} y={box.y + dy * box.h}>
          <Sized
            size={Math.max(12, box.w * (i % 2 ? 0.22 : 0.32))}
            initial={{ opacity: 0, scale: 0, rotate: 0 }}
            animate={reduceMotion ? { opacity: [0, 1, 0], scale: 1 } : { opacity: [0, 1, 1, 0], scale: [0, 1.2, 0.8, 1, 0], rotate: [0, 45, 90] }}
            transition={{ duration: linger, delay: delay + i * 0.09, ease: "easeOut" }}
          >
            <SparkleArt className="h-full w-full" color={i % 3 === 2 ? FX.white : FX.sparkle} />
          </Sized>
        </Anchor>
      ))}
    </>
  );
}

function PolishFx({ box, xp, reduceMotion }: { box: GoodsBox; xp?: number; reduceMotion: boolean }) {
  const cloth = Math.max(44, box.w * 0.9);
  return (
    <>
      {/* 光の帯（グッズの箱の中だけ） */}
      <motion.div
        className="absolute overflow-hidden"
        style={{ left: L(box.x - box.w / 2), top: T(box.y - box.h), width: WP(box.w), height: HP(box.h) }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-y-0 w-1/2 -skew-x-12"
          style={{ background: `linear-gradient(90deg, transparent, ${FX.white}cc, transparent)` }}
          initial={{ x: "-120%" }}
          animate={{ x: "260%" }}
          transition={{ duration: 0.8, delay: reduceMotion ? 0 : 0.5, ease: "easeInOut" }}
        />
      </motion.div>
      <Anchor x={box.x} y={box.y - box.h * 0.45}>
        <Sized
          size={cloth}
          initial={{ opacity: 0, x: "-80%" }}
          animate={reduceMotion ? { opacity: [0, 1, 0], x: "0%" } : { opacity: [0, 1, 1, 1, 1, 0], x: ["-80%", "70%", "-60%", "60%", "-20%", "0%"], rotate: [0, 12, -10, 10, -6, 0] }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        >
          <ClothArt className="h-full w-full drop-shadow-sm" />
        </Sized>
      </Anchor>
      <SparkleBurst box={box} delay={0.7} count={7} linger={1.4} reduceMotion={reduceMotion} />
      <XpPop box={box} xp={xp} delay={0.8} />
    </>
  );
}

function PhotoFx({ box, reduceMotion }: { box: GoodsBox; reduceMotion: boolean }) {
  const cam = Math.max(52, box.w * 1.0);
  return (
    <>
      <Anchor x={box.x} y={Math.max(box.y - box.h - cam * 0.2, cam * 0.6)}>
        <Sized
          size={cam}
          initial={{ opacity: 0, scale: 0.3, y: "20%" }}
          animate={reduceMotion ? { opacity: [0, 1, 1, 0], scale: 1 } : { opacity: [0, 1, 1, 1, 0], scale: [0.3, 1.15, 1, 0.92, 1], y: ["20%", "0%", "0%", "4%", "0%"] }}
          transition={{ duration: 1.0, times: [0, 0.3, 0.45, 0.55, 1] }}
        >
          <CameraArt className="h-full w-full drop-shadow" flash />
        </Sized>
      </Anchor>
      {/* シャッター（上下から閉じて、すぐ開く） */}
      {!reduceMotion && (
        <>
          <motion.div className="absolute inset-x-0 top-0 bg-foreground/80" initial={{ height: "0%" }} animate={{ height: ["0%", "0%", "50%", "0%"] }} transition={{ duration: 0.75, times: [0, 0.55, 0.68, 1] }} exit={{ opacity: 0 }} />
          <motion.div className="absolute inset-x-0 bottom-0 bg-foreground/80" initial={{ height: "0%" }} animate={{ height: ["0%", "0%", "50%", "0%"] }} transition={{ duration: 0.75, times: [0, 0.55, 0.68, 1] }} exit={{ opacity: 0 }} />
        </>
      )}
      {/* フラッシュ */}
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: FX.flash }}
        initial={{ opacity: 0 }}
        animate={{ opacity: reduceMotion ? [0, 0.4, 0] : [0, 0, 0.95, 0] }}
        transition={{ duration: 0.9, times: reduceMotion ? [0, 0.5, 1] : [0, 0.62, 0.7, 1] }}
        exit={{ opacity: 0 }}
      />
    </>
  );
}

function PhotoDoneFx({ box, xp, reduceMotion }: { box: GoodsBox; xp?: number; reduceMotion: boolean }) {
  return (
    <>
      <SparkleBurst box={box} delay={0} count={7} reduceMotion={reduceMotion} />
      <Hearts box={box} delay={0.25} count={3} reduceMotion={reduceMotion} />
      <XpPop box={box} xp={xp} delay={0.2} />
    </>
  );
}

function GiftFx({ box, xp, gift, reduceMotion }: { box: GoodsBox; xp?: number; gift?: string; reduceMotion: boolean }) {
  const size = Math.max(54, box.w * 1.0);
  const item = size * 0.62;
  // 箱は、グッズの上（上に余白が無ければグッズの横）に出す
  const above = box.y - box.h - size * 0.55 > size * 0.5;
  const bx = above ? box.x : box.x + (box.x > ROOM_W / 2 ? -1 : 1) * (box.w / 2 + size * 0.6);
  const by = above ? box.y - box.h - size * 0.55 : box.y - box.h * 0.5;
  // おやつが飛ぶ先（グッズの真ん中）までの距離を、おやつ自身の大きさの % で表す
  const toX = ((box.x - bx) / item) * 100;
  const toY = ((box.y - box.h * 0.5 - (by - size * 0.2)) / item) * 100;
  const Item = gift === "special" ? SpecialArt : CookieArt;
  return (
    <>
      <Anchor x={bx} y={by}>
        <Sized size={size} initial={{ opacity: 0, y: "-40%", scale: 0.4 }} animate={{ opacity: [0, 1, 1, 1, 1, 0], y: ["-40%", "0%", "-6%", "0%", "0%", "0%"], scale: [0.4, 1.1, 0.95, 1, 1, 0.9] }} transition={{ duration: 1.9, times: [0, 0.14, 0.22, 0.3, 0.8, 1] }}>
          <GiftBoxArt className="absolute inset-0 h-full w-full drop-shadow" />
          <motion.div
            className="absolute inset-0"
            initial={{ y: "0%", rotate: 0, opacity: 1 }}
            animate={reduceMotion ? { opacity: [1, 1, 0] } : { y: ["0%", "0%", "-70%"], x: ["0%", "0%", "-30%"], rotate: [0, 0, -28], opacity: [1, 1, 0] }}
            transition={{ duration: 0.9, times: [0, 0.55, 1] }}
          >
            <GiftLidArt className="h-full w-full" />
          </motion.div>
        </Sized>
      </Anchor>
      <Anchor x={bx} y={by - size * 0.2}>
        <Sized
          size={item}
          initial={{ opacity: 0, scale: 0.2 }}
          animate={
            reduceMotion
              ? { opacity: [0, 1, 0], scale: 1 }
              : { opacity: [0, 0, 1, 1, 1, 0], scale: [0.2, 0.2, 1.2, 1, 0.8, 0.3], x: ["0%", "0%", "0%", "0%", `${toX * 0.6}%`, `${toX}%`], y: ["0%", "0%", "-90%", "-110%", `${toY * 0.4}%`, `${toY}%`], rotate: [0, 0, -10, 10, 180, 300] }
          }
          transition={{ duration: 1.5, delay: 0.3, times: [0, 0.2, 0.42, 0.55, 0.8, 1], ease: "easeInOut" }}
        >
          <Item className="h-full w-full drop-shadow" />
        </Sized>
      </Anchor>
      <Hearts box={box} delay={1.6} count={4} reduceMotion={reduceMotion} />
      <SparkleBurst box={box} delay={1.6} count={4} reduceMotion={reduceMotion} />
      <XpPop box={box} xp={xp} delay={1.65} />
    </>
  );
}

/** 紙吹雪の1枚ずつ（毎回同じ並びでよい。乱数にすると描きなおすたびに位置が飛ぶ） */
const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  x: (i * 37) % 100,
  delay: (i % 9) * 0.09,
  dur: 1.9 + ((i * 7) % 10) / 10,
  rot: ((i * 53) % 360) - 180,
  drift: ((i * 13) % 20) - 10,
  color: FX.confetti[i % FX.confetti.length],
  round: i % 3 === 0,
}));

function LevelUpFx({ e, reduceMotion }: { e: RoomFxEvent; reduceMotion: boolean }) {
  const { t } = useLanguage();
  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      {!reduceMotion &&
        CONFETTI.map((c, i) => (
          <motion.span
            key={i}
            className="absolute block"
            style={{ left: `${c.x}%`, width: c.round ? "2.2%" : "1.6%", aspectRatio: c.round ? "1 / 1" : "1 / 2.2", backgroundColor: c.color, borderRadius: c.round ? "50%" : "2px" }}
            initial={{ top: "-6%", rotate: 0, x: "0%" }}
            animate={{ top: "106%", rotate: c.rot * 4, x: [`0%`, `${c.drift * 30}%`, `${-c.drift * 20}%`] }}
            transition={{ duration: c.dur, delay: c.delay, ease: "easeIn" }}
          />
        ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative flex w-[78%] flex-col items-center"
          initial={{ scale: 0.4, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 260, damping: 14 }}
        >
          {/* 後ろの光の筋（ゆっくり回る） */}
          {!reduceMotion && (
            <motion.svg viewBox="-50 -50 100 100" className="absolute -top-[40%] aspect-square w-[90%]" animate={{ rotate: 60 }} transition={{ duration: 4, ease: "linear" }}>
              {Array.from({ length: 12 }, (_, i) => (
                <path key={i} d="M0 0 L-4 -48 L4 -48Z" fill={FX.sparkle} opacity="0.35" transform={`rotate(${i * 30})`} />
              ))}
            </motion.svg>
          )}
          <svg viewBox="0 0 280 80" className="relative w-full drop-shadow-lg" aria-hidden="true">
            <path d="M8 22 L40 22 L40 66 L8 66 L20 44Z" fill={FX.ribbonDeep} />
            <path d="M272 22 L240 22 L240 66 L272 66 L260 44Z" fill={FX.ribbonDeep} />
            <path d="M30 12 Q140 -2 250 12 L250 62 Q140 48 30 62Z" fill={FX.ribbon} stroke={FX.ribbonDeep} strokeWidth="3" />
          </svg>
          <div className="absolute inset-x-0 top-0 flex aspect-[280/80] flex-col items-center justify-center pb-[2%] text-center" style={{ color: FX.ribbonText }}>
            <span className="text-2xs font-bold leading-tight opacity-90">{t("oshiRoom.fx.levelUp")}</span>
            <span className="text-xl font-black leading-tight tabular-nums">Lv.{e.level}</span>
          </div>
          <motion.div
            className="relative mt-2 max-w-full rounded-2xl bg-card px-3 py-1.5 text-center shadow-lg ring-1 ring-primary/30"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <p className="text-sm font-black text-primary">{e.level ? t(`engage.oshi.levelTitle.${e.level}`) : ""}</p>
            {e.name && <p className="line-clamp-1 text-2xs text-muted-foreground">{e.name}</p>}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
