import { FX, INK } from "../palette";
import { heartPath, sparklePath, starPath } from "./shapes";

/**
 * お世話の演出に出てくる小物の絵（手・クロス・カメラ・プレゼント箱・おやつ・特別なプレゼント・ハート・きらめき）。
 * どれも 0 0 64 64 の箱に描き、親が大きさと動きを決める。お世話ボタンの絵にも同じものを使う。
 */

const S = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** なでる手（上から、指をそろえて） */
export function HandArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M14 40 C10 30 12 20 18 16 C20 10 26 10 28 14 C30 8 38 8 39 14 C42 10 49 12 48 19 C53 18 56 24 52 30 L50 42 C48 52 40 58 30 56 C22 55 16 50 14 40Z"
        fill={FX.skin}
        {...S}
      />
      <path d="M28 14 L30 30 M39 14 L39 30 M48 19 L46 31" fill="none" stroke={FX.skinShade} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="24" cy="44" rx="4" ry="2.4" fill={FX.heartLight} />
      <path d="M8 12 l-4 -3 M10 6 l-1 -4 M14 8 l2 -4" stroke={FX.heart} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** みがくクロス（ふわっとした布に、きらめき） */
export function ClothArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M10 22 C18 14 30 18 38 12 C46 8 54 14 54 22 C56 34 50 46 40 50 C30 54 18 52 12 44 C6 38 6 28 10 22Z" fill={FX.cloth} {...S} />
      <path d="M14 30 C24 26 36 30 48 24 M14 38 C24 34 36 38 48 32" fill="none" stroke={FX.clothStripe} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M40 50 C42 54 40 58 36 58" fill="none" stroke={FX.clothShade} strokeWidth="3" strokeLinecap="round" />
      <path d={sparklePath(50, 10, 6)} fill={FX.sparkle} stroke={INK} strokeWidth="1.2" />
    </svg>
  );
}

/** カメラ */
export function CameraArt({ className, flash = false }: { className?: string; flash?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {flash && <path d={sparklePath(50, 12, 12)} fill={FX.flash} stroke={INK} strokeWidth="1" />}
      <rect x="8" y="20" width="48" height="34" rx="8" fill={FX.camera} {...S} />
      <path d="M22 20 l4 -7 h12 l4 7" fill={FX.camera} {...S} />
      <circle cx="32" cy="37" r="11" fill={FX.white} {...S} />
      <circle cx="32" cy="37" r="7" fill={FX.lens} stroke={INK} strokeWidth="1.6" />
      <circle cx="29" cy="34" r="2.2" fill={FX.white} />
      <rect x="44" y="25" width="7" height="4" rx="2" fill={FX.sparkle} stroke={INK} strokeWidth="1.2" />
      <path d={heartPath(15, 27, 2.6)} fill={FX.white} />
    </svg>
  );
}

/** プレゼント箱の本体（ふたは GiftLidArt で別に描いて、開くときに飛ばす） */
export function GiftBoxArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="10" y="26" width="44" height="32" rx="4" fill={FX.giftBox} {...S} />
      <rect x="28" y="26" width="8" height="32" fill={FX.giftRibbon} stroke={INK} strokeWidth="1.6" />
      <path d="M10 34 h44" stroke={FX.giftBoxShade} strokeWidth="3" />
    </svg>
  );
}

export function GiftLidArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M32 18 C24 4 12 8 18 16 C22 20 30 19 32 18Z M32 18 C40 4 52 8 46 16 C42 20 34 19 32 18Z" fill={FX.giftRibbon} {...S} />
      <rect x="6" y="17" width="52" height="12" rx="4" fill={FX.giftBox} {...S} />
      <rect x="28" y="17" width="8" height="12" fill={FX.giftRibbon} stroke={INK} strokeWidth="1.6" />
    </svg>
  );
}

/** ふた付きのプレゼント（ボタン用の1枚絵） */
export function GiftArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="10" y="26" width="44" height="32" rx="4" fill={FX.giftBox} {...S} />
      <rect x="28" y="26" width="8" height="32" fill={FX.giftRibbon} stroke={INK} strokeWidth="1.6" />
      <path d="M32 18 C24 4 12 8 18 16 C22 20 30 19 32 18Z M32 18 C40 4 52 8 46 16 C42 20 34 19 32 18Z" fill={FX.giftRibbon} {...S} />
      <rect x="6" y="17" width="52" height="12" rx="4" fill={FX.giftBox} {...S} />
      <rect x="28" y="17" width="8" height="12" fill={FX.giftRibbon} stroke={INK} strokeWidth="1.6" />
    </svg>
  );
}

/** おやつ（チョコチップのクッキー） */
export function CookieArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="24" fill={FX.cookie} {...S} />
      <path d="M16 26 C20 18 28 14 36 14" fill="none" stroke={FX.white} strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
      {[[24, 26], [38, 22], [42, 36], [28, 40], [34, 31], [20, 36]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="3" ry="2.4" fill={FX.choco} />
      ))}
      <path d="M48 46 C46 50 42 52 40 54" fill="none" stroke={FX.cookieShade} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** 特別なプレゼント（ハートの宝石と星） */
export function SpecialArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d={heartPath(32, 34, 22)} fill={FX.gem} {...S} />
      <path d="M20 26 L32 18 L44 26 L32 52Z" fill={FX.gemLight} opacity="0.55" />
      <path d="M20 26 h24 M32 18 v34" stroke={FX.white} strokeOpacity="0.6" strokeWidth="1.4" />
      <path d={starPath(50, 12, 8)} fill={FX.sparkle} stroke={INK} strokeWidth="1.4" />
      <path d={sparklePath(12, 16, 5)} fill={FX.sparkle} />
    </svg>
  );
}

export function HeartArt({ className, color = FX.heart }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d={heartPath(32, 34, 24)} fill={color} {...S} />
      <ellipse cx="22" cy="24" rx="5" ry="3.4" fill={FX.white} opacity="0.7" transform="rotate(-30 22 24)" />
    </svg>
  );
}

export function SparkleArt({ className, color = FX.sparkle }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d={sparklePath(32, 32, 28)} fill={color} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d={sparklePath(32, 32, 10)} fill={FX.white} opacity="0.8" />
    </svg>
  );
}
