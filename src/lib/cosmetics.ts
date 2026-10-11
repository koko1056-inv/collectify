import type { CSSProperties } from "react";

/**
 * 着せ替え（ポイントで解放する見た目）の定義を1か所にまとめる。
 *
 * - 解放キー（unlock_key）は point_shop_items / user_unlocks / profiles の列と同じ文字列。
 *   「cover:」はプロフィールのカバー、「frame:」はアイコンの縁、「share:」はシェアカードのデザイン、
 *   「room:」は推しの部屋のセット（壁紙・床・家具・グッズのフレームをまとめて解放。中身は lib/oshiRoom.ts）。
 * - ここの色はアプリのトークンではなく、それぞれの柄の「絵の具」。
 *   着せ替えは持ち主が選んだ見た目を、見る人のテーマ色に左右されずそのまま見せたいので、
 *   柄ごとの小さな色見本をここに閉じ込めて持つ（画面の部品の色はトークンを使う）。
 *   eslint の色の警告は Tailwind のクラス名にだけかかるため、ここでは disable は要らない。
 */

export type CoverKey =
  | "cover:starry"
  | "cover:holo"
  | "cover:oshi"
  | "cover:asanoha"
  | "cover:stripe"
  | "cover:gingham";

export type FrameKey = "frame:gold" | "frame:holo" | "frame:oshi" | "frame:stitch";

export type ShareTemplateKey = "share:night" | "share:washi" | "share:mono";

export const COVER_KEYS: CoverKey[] = [
  "cover:starry",
  "cover:holo",
  "cover:oshi",
  "cover:asanoha",
  "cover:stripe",
  "cover:gingham",
];

export const FRAME_KEYS: FrameKey[] = ["frame:gold", "frame:holo", "frame:oshi", "frame:stitch"];

export const SHARE_TEMPLATE_KEYS: ShareTemplateKey[] = ["share:night", "share:washi", "share:mono"];

/**
 * 推しの部屋のセット（ポイントショップで買う）。無料の基本セット（base）はキーを持たない。
 * DB の point_shop_items は棚の CHECK を広げずに category = 'cosmetic' のまま入れ、
 * ショップではこの頭（room:）で「お部屋」の棚に分ける
 */
export type RoomSetKey =
  | "room:oshi"
  | "room:sakura"
  | "room:natsu"
  | "room:halloween"
  | "room:xmas"
  | "room:yumekawa"
  | "room:showcase";

export const ROOM_SET_KEYS: RoomSetKey[] = [
  "room:oshi",
  "room:sakura",
  "room:natsu",
  "room:halloween",
  "room:xmas",
  "room:yumekawa",
  "room:showcase",
];

export function isCoverKey(v: string | null | undefined): v is CoverKey {
  return !!v && (COVER_KEYS as string[]).includes(v);
}
export function isFrameKey(v: string | null | undefined): v is FrameKey {
  return !!v && (FRAME_KEYS as string[]).includes(v);
}
export function isRoomSetKey(v: string | null | undefined): v is RoomSetKey {
  return !!v && (ROOM_SET_KEYS as string[]).includes(v);
}
export function isShareTemplateKey(v: string | null | undefined): v is ShareTemplateKey {
  return !!v && (SHARE_TEMPLATE_KEYS as string[]).includes(v);
}

/** 翻訳キーの末尾（cover:starry → cover_starry）。cosmetics.items.<これ>.name で名前を引く */
export function cosmeticI18nId(key: string): string {
  return key.replace(":", "_");
}

// ---------------------------------------------------------------------------
// 推し色（メンバーカラー）。profiles.profile_oshi_color の CHECK と同じ並び
// ---------------------------------------------------------------------------

export type OshiColor =
  | "red"
  | "pink"
  | "orange"
  | "yellow"
  | "green"
  | "mint"
  | "sky"
  | "blue"
  | "purple"
  | "white";

/** 推し色の見本。base は面の色、deep は同じ色相の濃い側（グラデーションの奥・縁の影） */
export const OSHI_COLORS: Record<OshiColor, { base: string; deep: string; light: boolean }> = {
  red: { base: "#E5484D", deep: "#B4232F", light: false },
  pink: { base: "#F07BA8", deep: "#C94C80", light: false },
  orange: { base: "#F5953C", deep: "#CF6A12", light: false },
  yellow: { base: "#F6CC3B", deep: "#D29E0B", light: true },
  green: { base: "#3FAE6A", deep: "#23804A", light: false },
  mint: { base: "#5ED3BE", deep: "#2BA48F", light: true },
  sky: { base: "#5DB8EE", deep: "#2E88C4", light: false },
  blue: { base: "#3B63D6", deep: "#2340A3", light: false },
  purple: { base: "#9061D8", deep: "#6838B3", light: false },
  white: { base: "#F5F2EC", deep: "#D8D1C4", light: true },
};

export const OSHI_COLOR_KEYS = Object.keys(OSHI_COLORS) as OshiColor[];

export function resolveOshiColor(v: string | null | undefined): OshiColor {
  return v && v in OSHI_COLORS ? (v as OshiColor) : "pink";
}

// ---------------------------------------------------------------------------
// カバー
// ---------------------------------------------------------------------------

/** 麻の葉の1区画（横 s・縦 s√3 で繰り返す）。三角形の格子と、各三角形の重心から頂点への線 */
function asanohaTile(s: number, stroke: string): { svg: string; w: number; h: number } {
  const t = (s * Math.sqrt(3)) / 2;
  const h = t * 2;
  const segs: string[] = [];
  const X = (j: number, k: number) => k * s + (((j % 2) + 2) % 2) * (s / 2);
  const seg = (x1: number, y1: number, x2: number, y2: number) =>
    segs.push(`M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`);
  const tri = (a: [number, number], b: [number, number], c: [number, number]) => {
    const cx = (a[0] + b[0] + c[0]) / 3;
    const cy = (a[1] + b[1] + c[1]) / 3;
    seg(a[0], a[1], b[0], b[1]);
    seg(b[0], b[1], c[0], c[1]);
    seg(c[0], c[1], a[0], a[1]);
    seg(cx, cy, a[0], a[1]);
    seg(cx, cy, b[0], b[1]);
    seg(cx, cy, c[0], c[1]);
  };
  for (let j = -1; j <= 2; j++) {
    for (let k = -1; k <= 2; k++) {
      const y0 = j * t;
      const y1 = (j + 1) * t;
      // 上の線の隣り合う2点と、下の線のあいだの点
      const a: [number, number] = [X(j, k), y0];
      const b: [number, number] = [X(j, k + 1), y0];
      const below = X(j + 1, k) > a[0] ? X(j + 1, k) : X(j + 1, k + 1);
      tri(a, b, [below, y1]);
      // 下の線の隣り合う2点と、上の線のあいだの点
      const c: [number, number] = [X(j + 1, k), y1];
      const d: [number, number] = [X(j + 1, k + 1), y1];
      const above = X(j, k) > c[0] ? X(j, k) : X(j, k + 1);
      tri(c, d, [above, y0]);
    }
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${s}' height='${h.toFixed(2)}' viewBox='0 0 ${s} ${h.toFixed(
    2
  )}'><path d='${segs.join("")}' fill='none' stroke='${stroke}' stroke-width='0.8' stroke-linecap='round'/></svg>`;
  return { svg, w: s, h };
}

const ASANOHA = asanohaTile(28, "rgba(232,206,150,0.42)");
const ASANOHA_URL = `url("data:image/svg+xml,${encodeURIComponent(ASANOHA.svg)}")`;

/** 星空の星。大小の点を3層に重ね、繰り返しの目が揃わないよう区画の大きさをずらす */
const STARS = [
  "radial-gradient(1.2px 1.2px at 18px 22px, rgba(255,255,255,0.95), transparent 60%)",
  "radial-gradient(1px 1px at 64px 48px, rgba(255,255,255,0.75), transparent 60%)",
  "radial-gradient(1.6px 1.6px at 102px 14px, rgba(255,244,214,0.95), transparent 60%)",
  "radial-gradient(1px 1px at 140px 76px, rgba(255,255,255,0.6), transparent 60%)",
  "radial-gradient(0.8px 0.8px at 36px 88px, rgba(255,255,255,0.7), transparent 60%)",
  "radial-gradient(1.4px 1.4px at 120px 104px, rgba(214,226,255,0.9), transparent 60%)",
].join(",");

export interface CoverLook {
  /** 一番下の面 */
  base: CSSProperties;
  /** 柄の層（重ねる順） */
  layers: CSSProperties[];
  /** 柄の上のボタン・文字を白にするか（暗い面） */
  dark: boolean;
  /** ゆっくり色が流れる層があるか（reduce motion では止める） */
  shimmer?: boolean;
}

export function getCoverLook(key: CoverKey, oshi: OshiColor = "pink"): CoverLook {
  switch (key) {
    case "cover:starry":
      return {
        base: { backgroundImage: "linear-gradient(180deg, #0E1533 0%, #1C2452 58%, #3B2F66 100%)" },
        layers: [
          { backgroundImage: STARS, backgroundSize: "160px 120px" },
          { backgroundImage: STARS, backgroundSize: "230px 170px", backgroundPosition: "40px 30px", opacity: 0.7 },
          {
            backgroundImage:
              "radial-gradient(60% 90% at 78% 110%, rgba(196,160,255,0.35), transparent 70%), radial-gradient(40% 60% at 12% -10%, rgba(120,170,255,0.25), transparent 70%)",
          },
        ],
        dark: true,
      };
    case "cover:holo":
      return {
        base: {
          backgroundImage:
            "linear-gradient(115deg, #F4D9F5 0%, #D9E4FF 22%, #D6F6EA 44%, #FFF1CC 66%, #F7D8E8 84%, #E2DAFF 100%)",
          backgroundSize: "220% 220%",
        },
        layers: [
          {
            backgroundImage:
              "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 45%, transparent 60%)",
            backgroundSize: "250% 100%",
          },
          {
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
            backgroundSize: "12px 12px",
          },
        ],
        dark: false,
        shimmer: true,
      };
    case "cover:oshi": {
      const c = OSHI_COLORS[oshi];
      return {
        base: { backgroundImage: `linear-gradient(135deg, ${c.base} 0%, ${c.deep} 100%)` },
        layers: [
          {
            backgroundImage: `radial-gradient(circle at 1px 1px, ${
              c.light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.28)"
            } 1.2px, transparent 0)`,
            backgroundSize: "16px 16px",
          },
          {
            backgroundImage:
              "radial-gradient(70% 120% at 20% 0%, rgba(255,255,255,0.35), transparent 65%), radial-gradient(50% 90% at 100% 100%, rgba(255,255,255,0.18), transparent 70%)",
          },
        ],
        dark: !c.light,
      };
    }
    case "cover:asanoha":
      return {
        base: { backgroundImage: "linear-gradient(160deg, #1E2C55 0%, #17213F 100%)" },
        layers: [
          { backgroundImage: ASANOHA_URL, backgroundSize: `${ASANOHA.w}px ${ASANOHA.h}px` },
          { backgroundImage: "radial-gradient(90% 120% at 50% 0%, rgba(255,255,255,0.10), transparent 70%)" },
        ],
        dark: true,
      };
    case "cover:stripe":
      return {
        base: { backgroundColor: "#F8E6E9" },
        layers: [
          {
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(222,150,166,0.55) 0 12px, transparent 12px 30px)",
          },
          { backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.35), transparent 70%)" },
        ],
        dark: false,
      };
    case "cover:gingham":
      return {
        base: { backgroundColor: "#FBFCFE" },
        layers: [
          {
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(110,160,214,0.30) 0 14px, transparent 14px 28px), repeating-linear-gradient(90deg, rgba(110,160,214,0.30) 0 14px, transparent 14px 28px)",
          },
        ],
        dark: false,
      };
  }
}

// ---------------------------------------------------------------------------
// アイコンの縁
// ---------------------------------------------------------------------------

export interface FrameLook {
  /** アイコンの外側の輪（padding で太さを作る） */
  ring: CSSProperties;
  /** ゆっくり回る（reduce motion では止める） */
  spin?: boolean;
}

export function getFrameLook(key: FrameKey, oshi: OshiColor = "pink"): FrameLook {
  switch (key) {
    case "frame:gold":
      return {
        ring: {
          backgroundImage:
            "conic-gradient(from 200deg, #A9781C, #F3D37A, #C8962F, #FFF0B8, #B5822A, #E9C25A, #A9781C)",
          boxShadow: "0 2px 10px rgba(169,120,28,0.35)",
        },
      };
    case "frame:holo":
      return {
        ring: {
          backgroundImage:
            "conic-gradient(#F7B4D6, #C9B8FF, #A8DCFF, #B8F2D8, #FFE7A8, #F7B4D6)",
          boxShadow: "0 0 12px rgba(160,140,255,0.35)",
        },
        spin: true,
      };
    case "frame:oshi": {
      const c = OSHI_COLORS[oshi];
      return {
        ring: {
          backgroundImage: `linear-gradient(135deg, ${c.base}, ${c.deep})`,
          boxShadow: `0 0 0 3px ${c.base}33`,
        },
      };
    }
    case "frame:stitch":
      // 細い輪の中だけが見えるので、放射状の縞がそのまま縫い目の点線に見える
      return {
        ring: {
          backgroundImage: "repeating-conic-gradient(#A9765A 0deg 5deg, #F1E0CC 5deg 10deg)",
        },
      };
  }
}

// ---------------------------------------------------------------------------
// シェアカードのデザイン（Canvas で使う色）
// ---------------------------------------------------------------------------

export interface ShareCardPalette {
  ink: string;
  muted: string;
  paper: string;
  accent: string;
  accentSoft: string;
  gold: string;
  track: string;
  tile: string;
  /** 数字のカードの面 */
  card: string;
  emptyFill: string;
  emptyStroke: string;
  emptyText: string;
  logoText: string;
}

/** 標準（無料）。以前から shareCard.ts にあった色 */
export const DEFAULT_SHARE_PALETTE: ShareCardPalette = {
  ink: "#2A1F24",
  muted: "#8A7B80",
  paper: "#FBF7F2",
  accent: "#D94A64",
  accentSoft: "#F7DDE2",
  gold: "#E0A21B",
  track: "#EADCD6",
  tile: "#FFFFFF",
  card: "#FFFFFF",
  emptyFill: "#F4ECE7",
  emptyStroke: "#D9C9C2",
  emptyText: "#C9B6AE",
  logoText: "#FFFFFF",
};

export const SHARE_TEMPLATE_PALETTES: Record<ShareTemplateKey, ShareCardPalette> = {
  // 紺の夜空に金
  "share:night": {
    ink: "#F4EFE3",
    muted: "#A7AED0",
    paper: "#141B3A",
    accent: "#E8C46A",
    accentSoft: "#2A3366",
    gold: "#F2D27C",
    track: "#2B3463",
    tile: "#FFFFFF",
    card: "#1E2650",
    emptyFill: "#1E2650",
    emptyStroke: "#3A4480",
    emptyText: "#5C67A3",
    logoText: "#141B3A",
  },
  // 生成りの和紙に藍と朱
  "share:washi": {
    ink: "#1F2A44",
    muted: "#7D7466",
    paper: "#F3ECDD",
    accent: "#C8402F",
    accentSoft: "#E7DCC6",
    gold: "#B8862B",
    track: "#E0D4BC",
    tile: "#FFFDF8",
    card: "#FFFDF8",
    emptyFill: "#EAE0CC",
    emptyStroke: "#CDBFA3",
    emptyText: "#B5A687",
    logoText: "#FFFFFF",
  },
  // 白と黒だけ
  "share:mono": {
    ink: "#111111",
    muted: "#6B6B6B",
    paper: "#FFFFFF",
    accent: "#111111",
    accentSoft: "#F1F1F1",
    gold: "#111111",
    track: "#E6E6E6",
    tile: "#F6F6F6",
    card: "#F4F4F4",
    emptyFill: "#F4F4F4",
    emptyStroke: "#D0D0D0",
    emptyText: "#BDBDBD",
    logoText: "#FFFFFF",
  },
};
