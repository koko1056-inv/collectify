import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";
import { cn } from "@/lib/utils";

/**
 * 「グッズを追加」シートの3択に添える小さな絵。
 *
 * 以前は3つとも「アイコン＋見出し＋説明」の同じ形の行で、読まないと違いがわからなかった。
 * 絵だけで「どんなときの入口か」が伝わるようにする。
 *   - 一覧から選ぶ: 実物のグッズ写真を重ねて「もうここにある」と見せる
 *   - 写真で追加:   ファインダーがグッズを捉え、AI が名前と価格を読み取る
 *   - 手入力で追加: 入力欄にペンで書き込む
 * 色は primary / points / foreground のトークンから取るので、テーマ色・ダークモードに自動で合う。
 * 繰り返しの動きは、動きを減らす設定の人には止める（止めた状態でも絵として成り立つ形にしてある）。
 */

const PRIMARY = "hsl(var(--primary))";
const POINTS = "hsl(var(--points))";
const FOREGROUND = "hsl(var(--foreground))";
const CARD = "hsl(var(--card))";

/** 四芒星（アプリアイコンの星）。AI が読み取った印に使う */
function sparklePath(cx: number, cy: number, r: number) {
  const k = r * 0.16;
  return `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
}

/**
 * カタログにある実物のグッズ写真を、カードのように少しずつずらして重ねる。
 * 写真がまだ無い（読み込み中・取れなかった）ときは、同じ形の空の台紙を出して大きさを保つ。
 */
export function CatalogStackArt({ images, className }: { images: string[]; className?: string }) {
  const reduce = useReducedMotion();
  const shown = images.slice(0, 3);
  // 奥から手前の順。手前（最後）をまっすぐに、奥を傾けて「束」に見せる
  const slots = [
    { x: -30, y: 6, r: -12 },
    { x: 30, y: 6, r: 11 },
    { x: 0, y: 0, r: -2 },
  ];
  return (
    <div className={cn("relative h-[5.5rem] w-[7.5rem] shrink-0", className)} aria-hidden="true">
      {slots.map((p, i) => {
        const src = shown[i];
        return (
          <motion.div
            key={src ?? `empty-${i}`}
            className="absolute left-1/2 top-1/2 -ml-[1.875rem] -mt-[2.375rem] h-[4.75rem] w-[3.75rem]"
            initial={reduce ? false : { opacity: 0, y: 18, rotate: 0, x: 0 }}
            animate={{ opacity: 1, y: p.y, rotate: p.r, x: p.x }}
            transition={{ type: "spring", stiffness: 240, damping: 20, delay: 0.08 + i * 0.08 }}
          >
            <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card p-1 shadow-md">
              <div className="min-h-0 flex-1 overflow-hidden rounded-md bg-muted">
                {src && (
                  <img
                    src={getOptimizedImageUrl(src, { width: 160 })}
                    onError={fallbackToOriginal(src)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              {/* 台紙の下の余白。トレカやチェキのように見せる（ウェルカムの GoodsFan と同じ意匠） */}
              <div className="flex h-2.5 items-center justify-center gap-0.5">
                <span className="h-0.5 w-0.5 rounded-full bg-primary/50" />
                <span className="h-0.5 w-2 rounded-full bg-primary/25" />
              </div>
            </div>
          </motion.div>
        );
      })}
      {/* 探す道具の印。「この中から探す」入口だと一目でわかるように */}
      <span className="absolute -bottom-0.5 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background">
        <Search className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    </div>
  );
}

/**
 * 写真で追加の絵。ファインダーの四隅の枠がアクスタを捉え、走査線が通ると、
 * 右に「名前」と「価格（¥）」の札が順に出てくる（AI が読み取っている様子）。
 */
export function CameraScanArt({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const loop = reduce ? undefined : { duration: 2.8, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" as const };
  // 札は走査線が通り過ぎてから出て、次の走査の前に消える
  const chip = (delay: number) =>
    reduce
      ? { initial: false as const, animate: { opacity: 1, x: 0 } }
      : {
          initial: { opacity: 0, x: -6 },
          animate: { opacity: [0, 0, 1, 1, 0], x: [-6, -6, 0, 0, 0] },
          transition: { duration: 2.8, times: [0, delay, delay + 0.12, 0.92, 1], repeat: Infinity, repeatDelay: 0.6 },
        };
  return (
    <svg viewBox="0 0 120 64" fill="none" className={cn("h-16 w-[7.5rem] overflow-visible", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-scan`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PRIMARY} stopOpacity="0" />
          <stop offset="1" stopColor={PRIMARY} stopOpacity="0.35" />
        </linearGradient>
        <clipPath id={`${id}-vf`}>
          <rect x="6" y="6" width="52" height="52" rx="6" />
        </clipPath>
      </defs>

      {/* ファインダーの中（写っているもの） */}
      <rect x="6" y="6" width="52" height="52" rx="6" fill={PRIMARY} fillOpacity="0.07" />
      {/* アクスタ（板＋台座）。推しのシルエットの代わりに丸い顔だけ描く */}
      <rect x="21" y="13" width="22" height="33" rx="4" fill={CARD} stroke={FOREGROUND} strokeOpacity="0.55" strokeWidth="1.6" />
      <circle cx="32" cy="26" r="6.5" fill={PRIMARY} fillOpacity="0.55" />
      <path d="M24.5 40 Q32 33.5 39.5 40" stroke={PRIMARY} strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="17" y="46" width="30" height="5" rx="2.5" fill={FOREGROUND} fillOpacity="0.35" />

      {/* 走査線（上から下へ通る） */}
      <g clipPath={`url(#${id}-vf)`}>
        <motion.g initial={{ y: reduce ? 18 : -14 }} animate={reduce ? undefined : { y: [-14, 56] }} transition={loop}>
          <rect x="6" y="0" width="52" height="12" fill={`url(#${id}-scan)`} />
          <rect x="6" y="11" width="52" height="1.6" rx="0.8" fill={PRIMARY} />
        </motion.g>
      </g>

      {/* 四隅の枠 */}
      <g stroke={PRIMARY} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 15 V8 Q3 3 8 3 H15" />
        <path d="M49 3 H56 Q61 3 61 8 V15" />
        <path d="M61 49 V56 Q61 61 56 61 H49" />
        <path d="M15 61 H8 Q3 61 3 56 V49" />
      </g>

      {/* 読み取った「名前」の札 */}
      <motion.g {...chip(0.38)}>
        <rect x="68" y="12" width="50" height="16" rx="8" fill={CARD} stroke={PRIMARY} strokeOpacity="0.35" />
        <path d={sparklePath(77, 20, 4.2)} fill={POINTS} />
        <rect x="84" y="17.5" width="27" height="5" rx="2.5" fill={FOREGROUND} fillOpacity="0.55" />
      </motion.g>
      {/* 読み取った「価格」の札 */}
      <motion.g {...chip(0.55)}>
        <rect x="68" y="34" width="40" height="16" rx="8" fill={CARD} stroke={PRIMARY} strokeOpacity="0.35" />
        <text x="77" y="45.5" textAnchor="middle" fontSize="10" fontWeight="700" fill={POINTS}>
          ¥
        </text>
        <rect x="84" y="39.5" width="17" height="5" rx="2.5" fill={FOREGROUND} fillOpacity="0.4" />
      </motion.g>
    </svg>
  );
}

/**
 * 手入力の絵。入力欄が2つ並んだカードに、ペンが2つ目の欄へ書き込んでいく。
 * 書いている線が伸び、カーソルがまたたく。
 */
export function ManualFormArt({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const write = reduce
    ? { initial: false as const, animate: { pathLength: 1 } }
    : {
        initial: { pathLength: 0 },
        animate: { pathLength: [0, 1, 1, 0] },
        transition: { duration: 3.2, times: [0, 0.55, 0.9, 1], repeat: Infinity, ease: "easeInOut" as const },
      };
  // ペンは書いている線の先に付いて動く
  const pen = reduce
    ? { initial: false as const, animate: { x: 26 } }
    : {
        initial: { x: 0 },
        animate: { x: [0, 26, 26, 0], y: [0, -1, 0, 0] },
        transition: { duration: 3.2, times: [0, 0.55, 0.9, 1], repeat: Infinity, ease: "easeInOut" as const },
      };
  return (
    <svg viewBox="0 0 120 64" fill="none" className={cn("h-16 w-[7.5rem] overflow-visible", className)} aria-hidden="true">
      {/* 用紙 */}
      <rect x="10" y="4" width="78" height="56" rx="8" fill={CARD} stroke={FOREGROUND} strokeOpacity="0.2" strokeWidth="1.4" />
      {/* 写真の枠（自分の写真を入れる所） */}
      <rect x="18" y="12" width="16" height="16" rx="3.5" fill={FOREGROUND} fillOpacity="0.07" stroke={FOREGROUND} strokeOpacity="0.3" strokeDasharray="3 2.5" />
      <path d="M26 16.5 V23.5 M22.5 20 H29.5" stroke={FOREGROUND} strokeOpacity="0.45" strokeWidth="1.6" strokeLinecap="round" />
      {/* 1つ目の欄（入力済み） */}
      <rect x="39" y="12" width="41" height="7" rx="3.5" fill={FOREGROUND} fillOpacity="0.07" />
      <rect x="42" y="14.5" width="24" height="2" rx="1" fill={FOREGROUND} fillOpacity="0.5" />
      <rect x="39" y="22" width="28" height="6" rx="3" fill={FOREGROUND} fillOpacity="0.05" />
      {/* 2つ目の欄（いま書いている） */}
      <rect x="18" y="35" width="62" height="11" rx="4" fill={CARD} stroke={PRIMARY} strokeOpacity="0.6" strokeWidth="1.4" />
      <motion.path
        d="M23 40.5 C27 38 29 43 33 40.5 S39 38 43 40.5 S48 42.5 49 40.5"
        stroke={FOREGROUND}
        strokeOpacity="0.7"
        strokeWidth="1.6"
        strokeLinecap="round"
        {...write}
      />
      <rect x="18" y="50" width="34" height="3.5" rx="1.75" fill={FOREGROUND} fillOpacity="0.12" />

      {/* ペン（先が書いている線の先にある） */}
      <motion.g {...pen}>
        <g transform="translate(23 40.5) rotate(-40)">
          <rect x="1.5" y="-3" width="30" height="6" rx="1.5" fill={FOREGROUND} fillOpacity="0.78" />
          <rect x="25" y="-3" width="6.5" height="6" rx="1.5" fill={PRIMARY} />
          <path d="M1.5 -3 L-4.5 0 L1.5 3 Z" fill={FOREGROUND} fillOpacity="0.45" />
          <path d="M-4.5 0 L-2 -1.25 L-2 1.25 Z" fill={FOREGROUND} />
          <rect x="4" y="-1.6" width="18" height="1.2" rx="0.6" fill="white" fillOpacity="0.35" />
        </g>
      </motion.g>
    </svg>
  );
}
