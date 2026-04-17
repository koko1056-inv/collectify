// 壁紙プリセット — 推し活ルームの背景
// 背景色 + 床の色 + アクセント で構成

export type WallpaperCategory = "clean" | "cute" | "elegant" | "vivid" | "themed";

export interface WallpaperPreset {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  category: WallpaperCategory;
  description: string;
  // 壁: グラデーション（CSS linear-gradient）または単色
  wallGradient: string;
  // 床: 色または CSS pattern
  floorGradient: string;
  // 床の上端の影の色
  floorShadow: string;
  // アクセントカラー（家具に色味を与える）
  accentColor: string;
  // オプション: 背景にパターン要素
  pattern?: "dots" | "stripes" | "sakura" | "stars" | "grid" | null;
  patternColor?: string;
}

export const WALLPAPERS: WallpaperPreset[] = [
  // === クリーン ===
  {
    id: "white_minimal",
    name: "ホワイトミニマル",
    nameEn: "White Minimal",
    icon: "⚪",
    category: "clean",
    description: "清潔感のある白い部屋",
    wallGradient: "linear-gradient(180deg, #f8fafc 0%, #e9edf3 100%)",
    floorGradient: "linear-gradient(180deg, #dee2ea 0%, #c9d0dd 100%)",
    floorShadow: "rgba(0,0,0,0.08)",
    accentColor: "#64748b",
  },
  {
    id: "cream_warm",
    name: "クリームウォーム",
    nameEn: "Cream Warm",
    icon: "🤍",
    category: "clean",
    description: "暖かみのあるクリーム色",
    wallGradient: "linear-gradient(180deg, #fdf9f3 0%, #f4ebd9 100%)",
    floorGradient: "linear-gradient(180deg, #e8d8be 0%, #d5c29c 100%)",
    floorShadow: "rgba(80,60,30,0.1)",
    accentColor: "#a8896b",
  },

  // === キュート ===
  {
    id: "sakura_pink",
    name: "桜ピンク",
    nameEn: "Sakura Pink",
    icon: "🌸",
    category: "cute",
    description: "桜が舞うピンクルーム",
    wallGradient: "linear-gradient(180deg, #fef3f7 0%, #fbd5e4 100%)",
    floorGradient: "linear-gradient(180deg, #f5bfd3 0%, #eda1bb 100%)",
    floorShadow: "rgba(120,40,80,0.12)",
    accentColor: "#ec4899",
    pattern: "sakura",
    patternColor: "#fda4bd",
  },
  {
    id: "cotton_candy",
    name: "コットンキャンディ",
    nameEn: "Cotton Candy",
    icon: "🍬",
    category: "cute",
    description: "パステルな夢空間",
    wallGradient: "linear-gradient(180deg, #fef0ff 0%, #e0e7ff 100%)",
    floorGradient: "linear-gradient(180deg, #d8c8f0 0%, #b8a8dc 100%)",
    floorShadow: "rgba(100,60,140,0.1)",
    accentColor: "#c084fc",
    pattern: "dots",
    patternColor: "#f0abfc",
  },
  {
    id: "mint_cafe",
    name: "ミントカフェ",
    nameEn: "Mint Cafe",
    icon: "🍃",
    category: "cute",
    description: "爽やかなカフェ風",
    wallGradient: "linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)",
    floorGradient: "linear-gradient(180deg, #a7f3d0 0%, #6ee7b7 100%)",
    floorShadow: "rgba(30,100,60,0.12)",
    accentColor: "#10b981",
  },
  {
    id: "lavender_dream",
    name: "ラベンダードリーム",
    nameEn: "Lavender Dream",
    icon: "💜",
    category: "cute",
    description: "やさしいラベンダーの香り",
    wallGradient: "linear-gradient(180deg, #faf5ff 0%, #e9d5ff 100%)",
    floorGradient: "linear-gradient(180deg, #d8b4fe 0%, #c084fc 100%)",
    floorShadow: "rgba(80,30,120,0.12)",
    accentColor: "#a855f7",
  },

  // === エレガント ===
  {
    id: "dark_academia",
    name: "ダークアカデミア",
    nameEn: "Dark Academia",
    icon: "📖",
    category: "elegant",
    description: "落ち着いた深いグリーン",
    wallGradient: "linear-gradient(180deg, #1e2a24 0%, #0f1713 100%)",
    floorGradient: "linear-gradient(180deg, #2a1d14 0%, #1a120c 100%)",
    floorShadow: "rgba(0,0,0,0.5)",
    accentColor: "#d4a574",
  },
  {
    id: "midnight_lounge",
    name: "ミッドナイトラウンジ",
    nameEn: "Midnight Lounge",
    icon: "🌙",
    category: "elegant",
    description: "深夜バーの雰囲気",
    wallGradient: "linear-gradient(180deg, #1a1528 0%, #0a0614 100%)",
    floorGradient: "linear-gradient(180deg, #2a1d3d 0%, #160e24 100%)",
    floorShadow: "rgba(0,0,0,0.6)",
    accentColor: "#f59e0b",
  },

  // === ビビッド ===
  {
    id: "cyber_neon",
    name: "サイバーネオン",
    nameEn: "Cyber Neon",
    icon: "🌃",
    category: "vivid",
    description: "ネオンが映える夜の部屋",
    wallGradient: "linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    floorGradient: "linear-gradient(180deg, #1f1b45 0%, #0d0a25 100%)",
    floorShadow: "rgba(168,85,247,0.3)",
    accentColor: "#a855f7",
    pattern: "grid",
    patternColor: "#a855f7",
  },
  {
    id: "ocean_breeze",
    name: "オーシャンブリーズ",
    nameEn: "Ocean Breeze",
    icon: "🌊",
    category: "vivid",
    description: "海辺のリゾート",
    wallGradient: "linear-gradient(180deg, #e0f2fe 0%, #7dd3fc 100%)",
    floorGradient: "linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%)",
    floorShadow: "rgba(0,30,80,0.2)",
    accentColor: "#0ea5e9",
  },

  // === テーマ ===
  {
    id: "shrine_sunset",
    name: "夕焼け神社",
    nameEn: "Sunset Shrine",
    icon: "⛩️",
    category: "themed",
    description: "神聖な夕焼けの神社",
    wallGradient: "linear-gradient(180deg, #fb923c 0%, #ea580c 100%)",
    floorGradient: "linear-gradient(180deg, #7c2d12 0%, #431407 100%)",
    floorShadow: "rgba(120,40,0,0.3)",
    accentColor: "#fb923c",
  },
  {
    id: "gaming_den",
    name: "ゲーミング部屋",
    nameEn: "Gaming Den",
    icon: "🎮",
    category: "themed",
    description: "RGBライティング全開",
    wallGradient: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
    floorGradient: "linear-gradient(180deg, #1e1b4b 0%, #0e0b2c 100%)",
    floorShadow: "rgba(34,197,94,0.25)",
    accentColor: "#22c55e",
  },
];

export const WALLPAPER_CATEGORY_LABELS: Record<WallpaperCategory, { label: string; icon: string }> = {
  clean: { label: "クリーン", icon: "⚪" },
  cute: { label: "キュート", icon: "🌸" },
  elegant: { label: "エレガント", icon: "🌙" },
  vivid: { label: "ビビッド", icon: "🌃" },
  themed: { label: "テーマ", icon: "⛩️" },
};

export function getWallpaperById(id: string): WallpaperPreset | undefined {
  return WALLPAPERS.find((w) => w.id === id);
}

export const DEFAULT_WALLPAPER_ID = "white_minimal";
