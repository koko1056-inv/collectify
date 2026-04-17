// BGM presets per theme category.
// Uses royalty-free loops hosted on Supabase Storage or external CDN.
// For now, presets point to lofi/ambient tracks — replace URLs as needed.

export interface BgmPreset {
  id: string;
  name: string;
  icon: string;
  url: string;
  mood: "chill" | "upbeat" | "mystical" | "cozy" | "epic";
  recommendedThemes: string[]; // roomTheme ids
}

// Placeholder URLs — replace with actual hosted audio files
const BASE = "https://dmgrgzysrzzgsajwqyrh.supabase.co/storage/v1/object/public/bgm";

export const BGM_PRESETS: BgmPreset[] = [
  {
    id: "lofi_chill",
    name: "ローファイ・チル",
    icon: "🎧",
    url: `${BASE}/lofi-chill.mp3`,
    mood: "chill",
    recommendedThemes: ["cyber_neon", "midnight_lounge", "sakura_night"],
  },
  {
    id: "cafe_ambient",
    name: "カフェアンビエント",
    icon: "☕",
    url: `${BASE}/cafe-ambient.mp3`,
    mood: "cozy",
    recommendedThemes: ["mint_cafe", "sunny_room", "cotton_candy"],
  },
  {
    id: "synthwave",
    name: "シンセウェーブ",
    icon: "🌆",
    url: `${BASE}/synthwave.mp3`,
    mood: "upbeat",
    recommendedThemes: ["cyber_neon", "gaming_den"],
  },
  {
    id: "forest_ambient",
    name: "森の環境音",
    icon: "🌲",
    url: `${BASE}/forest-ambient.mp3`,
    mood: "mystical",
    recommendedThemes: ["enchanted_forest", "sunny_room"],
  },
  {
    id: "rain",
    name: "雨音",
    icon: "🌧️",
    url: `${BASE}/rain.mp3`,
    mood: "chill",
    recommendedThemes: ["midnight_lounge", "sakura_night"],
  },
  {
    id: "crystal_chimes",
    name: "クリスタル・チャイム",
    icon: "💎",
    url: `${BASE}/crystal-chimes.mp3`,
    mood: "mystical",
    recommendedThemes: ["crystal_palace", "void_space"],
  },
  {
    id: "game_8bit",
    name: "8ビットゲーム",
    icon: "🎮",
    url: `${BASE}/8bit.mp3`,
    mood: "upbeat",
    recommendedThemes: ["gaming_den"],
  },
  {
    id: "shrine_wind",
    name: "神社の風",
    icon: "⛩️",
    url: `${BASE}/shrine-wind.mp3`,
    mood: "mystical",
    recommendedThemes: ["sunset_shrine", "sakura_night"],
  },
];

export function getBgmById(id: string): BgmPreset | undefined {
  return BGM_PRESETS.find((b) => b.id === id);
}

export function getRecommendedBgm(themeId: string): BgmPreset | undefined {
  return BGM_PRESETS.find((b) => b.recommendedThemes.includes(themeId));
}
