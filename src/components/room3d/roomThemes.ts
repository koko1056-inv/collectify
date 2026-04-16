// Room theme presets — inspired by Rooms.xyz, Animal Crossing, Toca Boca
// Each theme defines colors, lighting mood, and suggested furniture

export interface RoomTheme {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  // Visual
  floorColor: string;
  wallColor: string;
  accentColor: string;
  // Lighting mood
  ambientIntensity: number;
  mainLightColor: string;
  mainLightIntensity: number;
  fillLightColor: string;
  // Particles
  particleColor: string;
  particleCount: number;
  // Environment
  environmentPreset: "city" | "sunset" | "dawn" | "night" | "warehouse" | "forest" | "apartment" | "studio" | "park" | "lobby";
  // Bloom
  bloomIntensity: number;
  // Category for UI grouping
  category: "dark" | "light" | "fantasy" | "premium";
}

export const ROOM_THEMES: RoomTheme[] = [
  // --- Dark themes ---
  {
    id: "cyber_neon",
    name: "サイバーネオン",
    nameEn: "Cyber Neon",
    icon: "🌃",
    description: "ネオンが映える夜の部屋",
    floorColor: "#0a0a1a",
    wallColor: "#12122a",
    accentColor: "#a855f7",
    ambientIntensity: 0.25,
    mainLightColor: "#ffffff",
    mainLightIntensity: 0.8,
    fillLightColor: "#6366f1",
    particleColor: "#a855f7",
    particleCount: 60,
    environmentPreset: "night",
    bloomIntensity: 0.5,
    category: "dark",
  },
  {
    id: "gaming_den",
    name: "ゲーミング部屋",
    nameEn: "Gaming Den",
    icon: "🎮",
    description: "RGB全開のゲーマー空間",
    floorColor: "#0f0f1a",
    wallColor: "#151525",
    accentColor: "#22c55e",
    ambientIntensity: 0.2,
    mainLightColor: "#ffffff",
    mainLightIntensity: 0.7,
    fillLightColor: "#22c55e",
    particleColor: "#3b82f6",
    particleCount: 40,
    environmentPreset: "warehouse",
    bloomIntensity: 0.6,
    category: "dark",
  },
  {
    id: "midnight_lounge",
    name: "ミッドナイトラウンジ",
    nameEn: "Midnight Lounge",
    icon: "🌙",
    description: "落ち着いた深夜のバー",
    floorColor: "#1a1520",
    wallColor: "#201a28",
    accentColor: "#f59e0b",
    ambientIntensity: 0.3,
    mainLightColor: "#ffd699",
    mainLightIntensity: 0.9,
    fillLightColor: "#f59e0b",
    particleColor: "#f59e0b",
    particleCount: 20,
    environmentPreset: "night",
    bloomIntensity: 0.4,
    category: "dark",
  },
  {
    id: "sakura_night",
    name: "桜夜",
    nameEn: "Sakura Night",
    icon: "🌸",
    description: "夜桜が舞う和モダン空間",
    floorColor: "#1a1018",
    wallColor: "#201520",
    accentColor: "#ec4899",
    ambientIntensity: 0.3,
    mainLightColor: "#ffc0cb",
    mainLightIntensity: 0.9,
    fillLightColor: "#ec4899",
    particleColor: "#f9a8d4",
    particleCount: 80,
    environmentPreset: "night",
    bloomIntensity: 0.45,
    category: "dark",
  },

  // --- Light themes ---
  {
    id: "sunny_room",
    name: "日向の部屋",
    nameEn: "Sunny Room",
    icon: "☀️",
    description: "陽光が差し込むナチュラル空間",
    floorColor: "#f5f0e8",
    wallColor: "#faf8f2",
    accentColor: "#f59e0b",
    ambientIntensity: 0.6,
    mainLightColor: "#fff5e6",
    mainLightIntensity: 1.5,
    fillLightColor: "#fbbf24",
    particleColor: "#fbbf24",
    particleCount: 15,
    environmentPreset: "apartment",
    bloomIntensity: 0.15,
    category: "light",
  },
  {
    id: "mint_cafe",
    name: "ミントカフェ",
    nameEn: "Mint Cafe",
    icon: "🍃",
    description: "爽やかなカフェ風空間",
    floorColor: "#e8f5f0",
    wallColor: "#f0faf5",
    accentColor: "#10b981",
    ambientIntensity: 0.55,
    mainLightColor: "#ffffff",
    mainLightIntensity: 1.3,
    fillLightColor: "#34d399",
    particleColor: "#6ee7b7",
    particleCount: 20,
    environmentPreset: "park",
    bloomIntensity: 0.1,
    category: "light",
  },
  {
    id: "cotton_candy",
    name: "コットンキャンディ",
    nameEn: "Cotton Candy",
    icon: "🍬",
    description: "パステルカラーの甘い空間",
    floorColor: "#fce7f3",
    wallColor: "#fff0f7",
    accentColor: "#f472b6",
    ambientIntensity: 0.55,
    mainLightColor: "#ffffff",
    mainLightIntensity: 1.3,
    fillLightColor: "#f9a8d4",
    particleColor: "#c084fc",
    particleCount: 30,
    environmentPreset: "studio",
    bloomIntensity: 0.2,
    category: "light",
  },
  {
    id: "ocean_breeze",
    name: "オーシャンブリーズ",
    nameEn: "Ocean Breeze",
    icon: "🌊",
    description: "海辺のリゾート気分",
    floorColor: "#e0f2fe",
    wallColor: "#f0f9ff",
    accentColor: "#0ea5e9",
    ambientIntensity: 0.5,
    mainLightColor: "#ffffff",
    mainLightIntensity: 1.4,
    fillLightColor: "#38bdf8",
    particleColor: "#7dd3fc",
    particleCount: 25,
    environmentPreset: "lobby",
    bloomIntensity: 0.15,
    category: "light",
  },

  // --- Fantasy themes ---
  {
    id: "enchanted_forest",
    name: "魔法の森",
    nameEn: "Enchanted Forest",
    icon: "🧚",
    description: "妖精が住む幻想的な空間",
    floorColor: "#0a2010",
    wallColor: "#0f2a15",
    accentColor: "#4ade80",
    ambientIntensity: 0.35,
    mainLightColor: "#a7f3d0",
    mainLightIntensity: 1.0,
    fillLightColor: "#4ade80",
    particleColor: "#86efac",
    particleCount: 100,
    environmentPreset: "forest",
    bloomIntensity: 0.5,
    category: "fantasy",
  },
  {
    id: "crystal_palace",
    name: "クリスタルパレス",
    nameEn: "Crystal Palace",
    icon: "💎",
    description: "氷の結晶に包まれた宮殿",
    floorColor: "#e0eeff",
    wallColor: "#eef5ff",
    accentColor: "#818cf8",
    ambientIntensity: 0.5,
    mainLightColor: "#e0e7ff",
    mainLightIntensity: 1.4,
    fillLightColor: "#a5b4fc",
    particleColor: "#c7d2fe",
    particleCount: 80,
    environmentPreset: "dawn",
    bloomIntensity: 0.4,
    category: "fantasy",
  },
  {
    id: "void_space",
    name: "ヴォイドスペース",
    nameEn: "Void Space",
    icon: "🕳️",
    description: "無限に広がる宇宙空間",
    floorColor: "#050510",
    wallColor: "#08081a",
    accentColor: "#818cf8",
    ambientIntensity: 0.15,
    mainLightColor: "#c4b5fd",
    mainLightIntensity: 0.6,
    fillLightColor: "#7c3aed",
    particleColor: "#c4b5fd",
    particleCount: 120,
    environmentPreset: "night",
    bloomIntensity: 0.7,
    category: "fantasy",
  },
  {
    id: "sunset_shrine",
    name: "夕焼けの神社",
    nameEn: "Sunset Shrine",
    icon: "⛩️",
    description: "黄昏時の神社",
    floorColor: "#2a1810",
    wallColor: "#351e15",
    accentColor: "#f97316",
    ambientIntensity: 0.4,
    mainLightColor: "#ffb380",
    mainLightIntensity: 1.2,
    fillLightColor: "#fb923c",
    particleColor: "#fdba74",
    particleCount: 50,
    environmentPreset: "sunset",
    bloomIntensity: 0.35,
    category: "fantasy",
  },
];

export const THEME_CATEGORIES = [
  { id: "dark", name: "ダーク", nameEn: "Dark", icon: "🌙" },
  { id: "light", name: "ライト", nameEn: "Light", icon: "☀️" },
  { id: "fantasy", name: "ファンタジー", nameEn: "Fantasy", icon: "✨" },
  { id: "premium", name: "プレミアム", nameEn: "Premium", icon: "👑" },
] as const;

export function getThemeById(id: string): RoomTheme | undefined {
  return ROOM_THEMES.find((t) => t.id === id);
}
