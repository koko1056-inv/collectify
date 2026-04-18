// マイルームのテーマプリセット (壁・床・光のセット)
// 背景カラム `background_color` に `theme:<id>` 形式で保存

export interface RoomTheme {
  id: string;
  name: string;
  emoji: string;
  // SVGで使う色 (HSLでなくても良い: シーン内専用)
  wall: string;       // 後ろ壁の色
  wallSide: string;   // 横壁の色
  floor: string;      // 床の色
  floorAlt: string;   // 床の市松模様用
  shelf: string;      // 棚の木の色
  shelfDark: string;  // 棚の影
  ambient: string;    // 全体の薄い空気感
  description: string;
}

export const ROOM_THEMES: RoomTheme[] = [
  {
    id: "natural",
    name: "ナチュラル",
    emoji: "🌿",
    wall: "#f5ede0",
    wallSide: "#ebe0cd",
    floor: "#d9b890",
    floorAlt: "#cca97e",
    shelf: "#a87854",
    shelfDark: "#7a5538",
    ambient: "#fff8eb",
    description: "あたたかい木目とベージュ",
  },
  {
    id: "night",
    name: "夜空",
    emoji: "🌙",
    wall: "#1f1b3a",
    wallSide: "#16122d",
    floor: "#2a2548",
    floorAlt: "#221d3d",
    shelf: "#3d3565",
    shelfDark: "#2a2447",
    ambient: "#2d2660",
    description: "深い藍色と紫のしずかな夜",
  },
  {
    id: "seaside",
    name: "海辺",
    emoji: "🌊",
    wall: "#dff3f7",
    wallSide: "#c8e8ef",
    floor: "#f0e6d0",
    floorAlt: "#e6d8b8",
    shelf: "#7fb8c8",
    shelfDark: "#558ea0",
    ambient: "#e8f7fa",
    description: "明るい砂浜と水色の光",
  },
  {
    id: "japanese",
    name: "和室",
    emoji: "🎏",
    wall: "#f0e8d4",
    wallSide: "#e3d9bf",
    floor: "#c4b88a",
    floorAlt: "#b8ac7c",
    shelf: "#5a4632",
    shelfDark: "#3d2f1f",
    ambient: "#fbf6e6",
    description: "畳と障子の落ち着いた空間",
  },
  {
    id: "cafe",
    name: "カフェ",
    emoji: "☕",
    wall: "#3a2a23",
    wallSide: "#2c1f1a",
    floor: "#5e3f2e",
    floorAlt: "#4d3324",
    shelf: "#8a5a3a",
    shelfDark: "#5d3b24",
    ambient: "#3d2a20",
    description: "ダークウッドの隠れ家",
  },
  {
    id: "pastel",
    name: "ゆめかわ",
    emoji: "🦄",
    wall: "#fde8f4",
    wallSide: "#fadcec",
    floor: "#f7e0ee",
    floorAlt: "#f0d2e6",
    shelf: "#d8a8d0",
    shelfDark: "#b888b0",
    ambient: "#fff0fa",
    description: "ピンクと紫のゆめかわ空間",
  },
  {
    id: "sakura",
    name: "桜",
    emoji: "🌸",
    wall: "#fff0f0",
    wallSide: "#ffe0e0",
    floor: "#e8c8b8",
    floorAlt: "#d8b8a8",
    shelf: "#c89090",
    shelfDark: "#a87070",
    ambient: "#fff5f5",
    description: "春の桜色のお部屋",
  },
  {
    id: "neon",
    name: "ネオン",
    emoji: "💜",
    wall: "#1a0d2e",
    wallSide: "#120822",
    floor: "#241640",
    floorAlt: "#1c1133",
    shelf: "#5d2d8c",
    shelfDark: "#3d1d5c",
    ambient: "#2a1247",
    description: "サイバーパンクなネオン部屋",
  },
];

export function getRoomTheme(id?: string | null): RoomTheme {
  if (!id) return ROOM_THEMES[0];
  // background_color に "theme:natural" 形式で保存される想定
  const cleaned = id.startsWith("theme:") ? id.slice(6) : id;
  return ROOM_THEMES.find((t) => t.id === cleaned) ?? ROOM_THEMES[0];
}

// 時間帯ごとの光のオーバーレイ
export type TimeOfDay = "morning" | "noon" | "evening" | "night";

export function getTimeOfDay(date = new Date()): TimeOfDay {
  const h = date.getHours();
  if (h < 6) return "night";
  if (h < 11) return "morning";
  if (h < 17) return "noon";
  if (h < 20) return "evening";
  return "night";
}

export function getTimeFilter(tod: TimeOfDay): {
  filter: string;
  overlay: string;
  overlayOpacity: number;
  greeting: string;
  emoji: string;
} {
  switch (tod) {
    case "morning":
      return {
        filter: "brightness(1.05) saturate(1.05)",
        overlay: "linear-gradient(180deg, rgba(255,220,150,0.15), rgba(255,200,180,0.05))",
        overlayOpacity: 0.6,
        greeting: "おはよう",
        emoji: "🌅",
      };
    case "noon":
      return {
        filter: "brightness(1.0) saturate(1.0)",
        overlay: "linear-gradient(180deg, rgba(255,255,255,0.05), transparent)",
        overlayOpacity: 0.4,
        greeting: "こんにちは",
        emoji: "☀️",
      };
    case "evening":
      return {
        filter: "brightness(0.95) saturate(1.15) hue-rotate(-8deg)",
        overlay: "linear-gradient(180deg, rgba(255,150,80,0.2), rgba(180,80,120,0.1))",
        overlayOpacity: 0.7,
        greeting: "おかえり",
        emoji: "🌇",
      };
    case "night":
      return {
        filter: "brightness(0.75) saturate(0.9) hue-rotate(220deg)",
        overlay: "linear-gradient(180deg, rgba(40,30,80,0.35), rgba(20,15,50,0.2))",
        overlayOpacity: 0.85,
        greeting: "こんばんは",
        emoji: "🌙",
      };
  }
}
