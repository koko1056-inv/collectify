import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * 「カタログにない・自作」グッズ追加（/add-item）の、追加のしかたに添える小さな絵。
 * 「グッズを追加」シートの絵（collection/AddGoodsArt.tsx）と同じ描き方にそろえる。
 *   - URLを貼る:      アドレス欄から、画像と名前の入ったカードが出てくる
 *   - うまくいく/苦手: 商品ページ（大きい写真・¥・カートのボタン）と、SNS の投稿（アイコン・文・ハート）
 *   - 画像を保存:     ページの画像を長押しすると、写真の一覧に入る（URL 読み込みが使えない人向け）
 *   - ガチャ:         カプセルから、キャラごとに別々のカードに分かれる
 * 実在の商品やロゴは描かない。色はトークンから取るので、テーマ色・ダークモードに合う。
 * 繰り返しの動きは、動きを減らす設定の人には止める（止めた状態でも絵として成り立つ形にしてある）。
 */

const PRIMARY = "hsl(var(--primary))";
const POINTS = "hsl(var(--points))";
const FOREGROUND = "hsl(var(--foreground))";
const CARD = "hsl(var(--card))";

/** 四芒星（アプリアイコンの星）。自動で入った印に使う */
function sparklePath(cx: number, cy: number, r: number) {
  const k = r * 0.16;
  return `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
}

/** アクスタの顔（丸い顔と体の線）。写真の代わりに描く */
function GoodsFace({ x, y, s = 1, tone = PRIMARY }: { x: number; y: number; s?: number; tone?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="-3" r="5" fill={tone} fillOpacity="0.6" />
      <path d="M-6 7 Q0 1.5 6 7" stroke={tone} strokeOpacity="0.6" strokeWidth="2.2" strokeLinecap="round" />
    </g>
  );
}

/**
 * URL を貼るの絵。左のアドレス欄（🔗 https://…）から矢印が出て、
 * 右の「画像＋名前（★）」のカードがぴょこっと弾む。
 */
export function UrlImportArt({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  // カードは消さずに、矢印が届いたところで弾ませる（止まった瞬間に見ても何の絵かわかるように）
  const pop = reduce
    ? { initial: false as const, animate: { scale: 1 } }
    : {
        initial: { scale: 1 },
        animate: { scale: [1, 1, 1.08, 1, 1] },
        transition: { duration: 3, times: [0, 0.3, 0.4, 0.5, 1], repeat: Infinity, repeatDelay: 0.4 },
      };
  const arrow = reduce
    ? { initial: false as const, animate: { pathLength: 1 } }
    : {
        initial: { pathLength: 0 },
        animate: { pathLength: [0, 1, 1, 0] },
        transition: { duration: 3, times: [0, 0.3, 0.9, 1], repeat: Infinity, repeatDelay: 0.4 },
      };
  return (
    <svg viewBox="0 0 120 64" fill="none" className={cn("h-16 w-[7.5rem] overflow-visible", className)} aria-hidden="true">
      {/* アドレス欄 */}
      <rect x="2" y="22" width="50" height="18" rx="9" fill={CARD} stroke={FOREGROUND} strokeOpacity="0.25" strokeWidth="1.4" />
      {/* 鎖のマーク（リンク） */}
      <g stroke={PRIMARY} strokeWidth="2" strokeLinecap="round">
        <rect x="7.5" y="28.5" width="7" height="5" rx="2.5" transform="rotate(-35 11 31)" />
        <rect x="11.5" y="28.5" width="7" height="5" rx="2.5" transform="rotate(-35 15 31)" />
      </g>
      <rect x="23" y="29" width="23" height="4" rx="2" fill={FOREGROUND} fillOpacity="0.45" />
      {/* 矢印 */}
      <motion.path d="M55 31 C62 31 62 31 69 31" stroke={PRIMARY} strokeWidth="2.4" strokeLinecap="round" {...arrow} />
      <path d="M66 27.5 L70 31 L66 34.5" stroke={PRIMARY} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* 読み込んだカード（画像＋名前） */}
      <motion.g style={{ transformOrigin: "96px 32px" }} {...pop}>
        <rect x="75" y="3" width="42" height="58" rx="7" fill={CARD} stroke={PRIMARY} strokeOpacity="0.45" strokeWidth="1.4" />
        <rect x="80" y="8" width="32" height="30" rx="4.5" fill={PRIMARY} fillOpacity="0.1" />
        <GoodsFace x={96} y={24} s={1.1} />
        <path d={sparklePath(84.5, 46, 3.6)} fill={POINTS} />
        <rect x="90" y="44" width="22" height="4" rx="2" fill={FOREGROUND} fillOpacity="0.55" />
        <rect x="80" y="52" width="18" height="3.5" rx="1.75" fill={FOREGROUND} fillOpacity="0.2" />
      </motion.g>
    </svg>
  );
}

/**
 * URL 読み込みの「うまくいくページ / 苦手なページ」の見本。
 * good: 公式通販の商品ページ（大きい写真・¥・カートのボタン）
 * bad:  SNS の投稿（アイコン・文・ハート）
 */
export function PageExampleArt({ kind, className }: { kind: "good" | "bad"; className?: string }) {
  return (
    <svg viewBox="0 0 56 64" fill="none" className={cn("h-16 w-14 shrink-0", className)} aria-hidden="true">
      <rect x="1" y="1" width="54" height="62" rx="7" fill={CARD} stroke={FOREGROUND} strokeOpacity="0.2" strokeWidth="1.4" />
      <rect x="1" y="1" width="54" height="9" rx="7" fill={FOREGROUND} fillOpacity="0.06" />
      <circle cx="7" cy="5.5" r="1.4" fill={FOREGROUND} fillOpacity="0.3" />
      <circle cx="11.5" cy="5.5" r="1.4" fill={FOREGROUND} fillOpacity="0.3" />
      {kind === "good" ? (
        <>
          {/* 大きい商品写真 */}
          <rect x="7" y="14" width="42" height="26" rx="4" fill={PRIMARY} fillOpacity="0.1" />
          <GoodsFace x={28} y={28} s={1.15} />
          {/* 名前・価格・カート */}
          <rect x="7" y="44" width="30" height="3.5" rx="1.75" fill={FOREGROUND} fillOpacity="0.55" />
          <text x="7" y="56" fontSize="7" fontWeight="700" fill={POINTS}>
            ¥
          </text>
          <rect x="12" y="51.5" width="12" height="3.5" rx="1.75" fill={FOREGROUND} fillOpacity="0.35" />
          <rect x="31" y="50" width="18" height="7" rx="3.5" fill={PRIMARY} />
        </>
      ) : (
        <>
          {/* 投稿者のアイコンと名前 */}
          <circle cx="11" cy="17" r="4" fill={FOREGROUND} fillOpacity="0.2" />
          <rect x="18" y="15.5" width="20" height="3" rx="1.5" fill={FOREGROUND} fillOpacity="0.4" />
          {/* 文 */}
          <rect x="7" y="25" width="42" height="3" rx="1.5" fill={FOREGROUND} fillOpacity="0.2" />
          <rect x="7" y="31" width="34" height="3" rx="1.5" fill={FOREGROUND} fillOpacity="0.2" />
          {/* 小さい写真が何枚か */}
          <rect x="7" y="38" width="20" height="13" rx="2.5" fill={FOREGROUND} fillOpacity="0.1" />
          <rect x="29" y="38" width="20" height="13" rx="2.5" fill={FOREGROUND} fillOpacity="0.1" />
          {/* ハート・リポスト */}
          <path
            d="M11 59.5 C7 56.5 7.5 54 9.5 54 C10.4 54 11 54.8 11 54.8 C11 54.8 11.6 54 12.5 54 C14.5 54 15 56.5 11 59.5 Z"
            fill={FOREGROUND}
            fillOpacity="0.3"
          />
          <path d="M20 55.5 H25 L23.5 54 M25 58 H20 L21.5 59.5" stroke={FOREGROUND} strokeOpacity="0.3" strokeWidth="1.2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/**
 * 画像を保存して選ぶの絵（URL 読み込みが使えない人の道筋）。
 * ページの写真を指で長押し → 波紋 → 写真の一覧に同じ画像が入る（✓）。
 */
export function SaveImageArt({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const ripple = reduce
    ? { initial: false as const, animate: { opacity: 0.35, scale: 1 } }
    : {
        initial: { opacity: 0, scale: 0.4 },
        animate: { opacity: [0, 0.5, 0], scale: [0.4, 1.2, 1.5] },
        transition: { duration: 1.6, repeat: Infinity, repeatDelay: 1.2 },
      };
  const land = reduce
    ? { initial: false as const, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: -6 },
        animate: { opacity: [0, 0, 1, 1, 0], y: [-6, -6, 0, 0, 0] },
        transition: { duration: 2.8, times: [0, 0.35, 0.5, 0.9, 1], repeat: Infinity },
      };
  return (
    <svg viewBox="0 0 120 64" fill="none" className={cn("h-16 w-[7.5rem] overflow-visible", className)} aria-hidden="true">
      <defs>
        <clipPath id={`${id}-page`}>
          <rect x="4" y="4" width="46" height="56" rx="7" />
        </clipPath>
      </defs>
      {/* ページ */}
      <rect x="4" y="4" width="46" height="56" rx="7" fill={CARD} stroke={FOREGROUND} strokeOpacity="0.2" strokeWidth="1.4" />
      <g clipPath={`url(#${id}-page)`}>
        <rect x="4" y="4" width="46" height="8" fill={FOREGROUND} fillOpacity="0.06" />
      </g>
      <rect x="9" y="16" width="36" height="24" rx="4" fill={PRIMARY} fillOpacity="0.1" />
      <GoodsFace x={27} y={29} />
      <rect x="9" y="45" width="26" height="3.5" rx="1.75" fill={FOREGROUND} fillOpacity="0.4" />
      <rect x="9" y="52" width="16" height="3.5" rx="1.75" fill={FOREGROUND} fillOpacity="0.2" />
      {/* 長押しの指と波紋 */}
      <motion.circle cx="36" cy="33" r="7" fill={PRIMARY} style={{ transformOrigin: "36px 33px" }} {...ripple} />
      <path
        d="M36 33 V25.5 a2.2 2.2 0 0 1 4.4 0 V33 l3.8 1.2 a3 3 0 0 1 2 3.4 L45 44 H36.5 L32 38 a2 2 0 0 1 3-2.6 Z"
        fill={CARD}
        stroke={FOREGROUND}
        strokeOpacity="0.7"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* 矢印 */}
      <path d="M56 32 H68 M64.5 28.5 L68 32 L64.5 35.5" stroke={PRIMARY} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* 写真の一覧（3x2） */}
      <rect x="74" y="10" width="44" height="44" rx="7" fill={CARD} stroke={FOREGROUND} strokeOpacity="0.2" strokeWidth="1.4" />
      {[0, 1, 2].map((c) =>
        [0, 1].map((r) =>
          c === 0 && r === 0 ? null : (
            <rect key={`${c}-${r}`} x={78 + c * 13.3} y={15 + r * 17} width="10.6" height="14" rx="2" fill={FOREGROUND} fillOpacity="0.1" />
          )
        )
      )}
      {/* 保存した画像（✓付き） */}
      <motion.g {...land}>
        <rect x="78" y="15" width="10.6" height="14" rx="2" fill={PRIMARY} fillOpacity="0.25" stroke={PRIMARY} strokeWidth="1.2" />
        <circle cx="88" cy="15.5" r="4" fill={PRIMARY} />
        <path d="M86.2 15.5 L87.5 16.8 L89.9 14.3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
    </svg>
  );
}

/**
 * ガチャ・くじの絵。カプセル1つから、キャラごとに色の違うカードが3枚に分かれる（＝1キャラ1件）。
 */
export function GachaSplitArt({ className }: { className?: string }) {
  const tones = ["hsl(var(--primary))", "hsl(var(--points))", "hsl(var(--foreground))"];
  return (
    <svg viewBox="0 0 96 48" fill="none" className={cn("h-12 w-24 shrink-0", className)} aria-hidden="true">
      {/* カプセル */}
      <circle cx="16" cy="24" r="13" fill={CARD} stroke={FOREGROUND} strokeOpacity="0.35" strokeWidth="1.4" />
      <path d="M3 24 A13 13 0 0 1 29 24 Z" fill={PRIMARY} fillOpacity="0.55" />
      <path d="M3 24 H29" stroke={FOREGROUND} strokeOpacity="0.35" strokeWidth="1.4" />
      <text x="16" y="34" textAnchor="middle" fontSize="8" fontWeight="700" fill={FOREGROUND} fillOpacity="0.55">
        ?
      </text>
      {/* 分かれる線 */}
      <path d="M31 24 L44 9 M31 24 H44 M31 24 L44 39" stroke={PRIMARY} strokeOpacity="0.6" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2.5 2.5" />
      {/* キャラごとのカード */}
      {tones.map((tone, i) => (
        <g key={i} transform={`translate(${47 + i * 16} ${6 + (i === 1 ? 4 : 0)})`}>
          <rect x="0" y="0" width="14" height="19" rx="3" fill={CARD} stroke={tone} strokeOpacity="0.6" strokeWidth="1.2" />
          <GoodsFace x={7} y={9.5} s={0.62} tone={tone} />
          <rect x="2.5" y="22" width="9" height="3" rx="1.5" fill={tone} fillOpacity="0.5" />
        </g>
      ))}
    </svg>
  );
}
