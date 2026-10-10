import { useId } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";
import { cn } from "@/lib/utils";

/**
 * ウェルカム（初回オンボーディング）の絵。
 *
 * 以前は lucide の汎用アイコン（Sparkles・Heart・Check）を薄い四角に入れていたが、
 * どのアプリにもある見た目で、Collectify らしさが無かった。
 * ここでは、アプリアイコンの「C の三日月と四芒星」を形の元にして、ステップごとに絵を描く。
 *   - ようこそ: ブランドマーク（C が描かれて、星がきらめく）
 *   - 推し選び: ペンライト（推し活の道具）
 *   - 準備完了: いま登録したグッズの写真を、カードのように扇状に並べる
 * 色はすべて primary / foreground のトークンから取るので、テーマ色・ダークモードに自動で合う。
 * 動きは MotionConfig(reducedMotion="user") の下で、動きを減らす設定の人には止まる。
 */

const PRIMARY = "hsl(var(--primary))";
const FOREGROUND = "hsl(var(--foreground))";

/** 四芒星（アプリアイコンの星）。辺を内側に反らせた、きらめきの形 */
function sparklePath(cx: number, cy: number, r: number) {
  const k = r * 0.16; // 中心からの控え。0 だと細すぎ、大きいと菱形になる
  return [
    `M${cx} ${cy - r}`,
    `Q${cx + k} ${cy - k} ${cx + r} ${cy}`,
    `Q${cx + k} ${cy + k} ${cx} ${cy + r}`,
    `Q${cx - k} ${cy + k} ${cx - r} ${cy}`,
    `Q${cx - k} ${cy - k} ${cx} ${cy - r}`,
    "Z",
  ].join(" ");
}

/** まわりで小さくまたたく星。delay をずらして、同時に光らないようにする */
function Twinkle({
  cx,
  cy,
  r,
  delay = 0,
  opacity = 0.5,
  color = PRIMARY,
}: {
  cx: number;
  cy: number;
  r: number;
  delay?: number;
  opacity?: number;
  color?: string;
}) {
  return (
    <motion.path
      d={sparklePath(cx, cy, r)}
      fill={color}
      style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: "view-box" }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1, 0.7, 1], opacity: [0, opacity, opacity * 0.5, opacity] }}
      transition={{ duration: 2.4, delay, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
    />
  );
}

/**
 * ブランドマーク。アプリアイコンと同じ「右が開いた C」と、その開きに浮かぶ四芒星。
 * C は一筆で描かれ、描き終わりに星が回りながら現れる。
 */
export function BrandMark({ size = 72, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  // C: 中心 (29,33)・半径 19。右上(-45°)から左回りに右下(45°)まで。星は C の両端に触れないよう開きの中に置く
  const arc = "M42.4 19.6 A19 19 0 1 0 42.4 46.4";
  // 左上だけに細い光を入れて、エナメルのピンバッジのような艶を出す
  const glint = "M17.5 24 A15.5 15.5 0 0 1 27 17.6";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn("overflow-visible", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-c`} x1="10" y1="52" x2="44" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={PRIMARY} />
          <stop offset="1" stopColor={PRIMARY} stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={PRIMARY} stopOpacity="0.16" />
          <stop offset="1" stopColor={PRIMARY} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="32" cy="32" r="32" fill={`url(#${id}-halo)`} />

      <motion.path
        d={arc}
        stroke={`url(#${id}-c)`}
        strokeWidth="7.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.path
        d={glint}
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6, ease: "easeOut" }}
      />

      <motion.g
        style={{ transformOrigin: "50.5px 31px", transformBox: "view-box" }}
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 14, delay: 0.7 }}
      >
        <path d={sparklePath(50.5, 31, 8.5)} fill={PRIMARY} />
        <circle cx="50.5" cy="31" r="1.5" fill="white" fillOpacity="0.85" />
      </motion.g>

      <Twinkle cx={58} cy={10} r={3} delay={1.2} opacity={0.45} />
      <Twinkle cx={5} cy={54} r={2.4} delay={1.8} opacity={0.35} />
      <Twinkle cx={59} cy={47} r={2} delay={2.3} opacity={0.3} />
    </svg>
  );
}

/**
 * ペンライト。推し活の道具で「推しを選ぶ」ステップの絵にする。
 * 光る筒・つば・持ち手を描き分け、筒のまわりにやわらかい光、先に四芒星。
 */
export function PenlightArt({ size = 64, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn("overflow-visible", className)}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={PRIMARY} stopOpacity="0.32" />
          <stop offset="1" stopColor={PRIMARY} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-tube`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={PRIMARY} stopOpacity="0.75" />
          <stop offset="0.45" stopColor={PRIMARY} />
          <stop offset="1" stopColor={PRIMARY} stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* 振っているように、少し傾けてゆっくり揺らす */}
      <motion.g
        style={{ transformOrigin: "32px 56px", transformBox: "view-box" }}
        initial={{ rotate: -8, opacity: 0, y: 6 }}
        animate={{ rotate: [-22, -14, -22], opacity: 1, y: 0 }}
        transition={{
          rotate: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 0.3 },
          y: { type: "spring", stiffness: 260, damping: 18 },
        }}
      >
        <motion.circle
          cx="32"
          cy="20"
          r="22"
          fill={`url(#${id}-glow)`}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* 光る筒 */}
        <rect x="26" y="4" width="12" height="31" rx="6" fill={`url(#${id}-tube)`} />
        <rect x="28.8" y="8" width="2.4" height="22" rx="1.2" fill="white" fillOpacity="0.55" />
        {/* つば */}
        <rect x="24" y="34.5" width="16" height="5" rx="2" fill={FOREGROUND} fillOpacity="0.82" />
        {/* 持ち手とボタン */}
        <rect x="26.5" y="39" width="11" height="19" rx="3.5" fill={FOREGROUND} fillOpacity="0.68" />
        <circle cx="32" cy="45.5" r="1.9" fill={PRIMARY} />
        <rect x="30.6" y="50" width="2.8" height="4.5" rx="1.4" fill="white" fillOpacity="0.25" />
      </motion.g>

      <Twinkle cx={52} cy={12} r={5.5} delay={0.4} opacity={0.9} />
      <Twinkle cx={10} cy={20} r={3} delay={1.1} opacity={0.45} />
      <Twinkle cx={55} cy={36} r={2.4} delay={1.7} opacity={0.35} />
    </svg>
  );
}

/**
 * 準備完了の絵。いま登録したグッズの写真を、トレーディングカードのように扇状に並べる。
 * 1枚も無い（あとで選ぶ・写真から登録）ときは、ブランドマークを大きく出す。
 */
export function GoodsFan({ images, className }: { images: string[]; className?: string }) {
  const shown = images.slice(0, 3);
  if (shown.length === 0) {
    return (
      <div className={cn("flex h-36 items-center justify-center", className)}>
        <BrandMark size={104} />
      </div>
    );
  }

  // 枚数ごとの並べ方（中央を手前・まっすぐに、両側を傾けて奥へ）
  const layouts: Record<number, { x: number; y: number; r: number }[]> = {
    1: [{ x: 0, y: 0, r: -3 }],
    2: [
      { x: -30, y: 4, r: -8 },
      { x: 30, y: 0, r: 6 },
    ],
    3: [
      { x: -58, y: 10, r: -12 },
      { x: 58, y: 10, r: 12 },
      { x: 0, y: 0, r: 0 },
    ],
  };
  const layout = layouts[shown.length];
  // 中央（手前）のカードを最後に描くよう、3枚のときは [左, 右, 中央] の順に並べ替える
  const ordered = shown.length === 3 ? [shown[1], shown[2], shown[0]] : shown;

  return (
    <div className={cn("relative mx-auto h-40 w-full max-w-[18rem]", className)}>
      <svg
        viewBox="0 0 288 160"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        aria-hidden="true"
      >
        <Twinkle cx={34} cy={22} r={7} delay={0.9} opacity={0.75} />
        <Twinkle cx={262} cy={36} r={5} delay={1.3} opacity={0.6} />
        <Twinkle cx={250} cy={140} r={3.5} delay={1.7} opacity={0.4} />
        <Twinkle cx={20} cy={128} r={3} delay={2.1} opacity={0.35} />
      </svg>

      {ordered.map((src, i) => {
        const p = layout[i];
        const front = shown.length === 3 ? i === 2 : i === shown.length - 1;
        return (
          <motion.div
            key={`${src}-${i}`}
            className="absolute left-1/2 top-1/2 h-[7.5rem] w-24 -ml-12 -mt-[3.75rem]"
            initial={{ opacity: 0, y: 40, rotate: 0, x: 0, scale: 0.85 }}
            animate={{ opacity: 1, y: p.y, rotate: p.r, x: p.x, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.15 + i * 0.12 }}
          >
            <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card p-1.5 shadow-lg">
              <div className="min-h-0 flex-1 overflow-hidden rounded-lg bg-muted">
                <img
                  src={getOptimizedImageUrl(src, { width: 240 })}
                  onError={fallbackToOriginal(src)}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
              {/* カードの下の余白。トレカやチェキのような台紙に見せる */}
              <div className="flex h-4 items-center justify-center gap-0.5" aria-hidden="true">
                <span className="h-1 w-1 rounded-full bg-primary/50" />
                <span className="h-1 w-3 rounded-full bg-primary/25" />
              </div>
            </div>
            {front && (
              <motion.span
                className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-success text-success-foreground shadow-md ring-2 ring-background"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.6 }}
              >
                <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
              </motion.span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
