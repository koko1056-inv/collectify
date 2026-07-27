// Display style system: convert a goods image into a room-displayable form.
// Instead of (or before) full 3D generation, we wrap the 2D image in a
// "styled frame" that makes it feel like a figure / poster / plushie / etc.

export type DisplayStyle =
  | "poster"
  | "figure"
  | "plush"
  | "acrylic_stand"
  | "trophy"
  | "framed";

export interface DisplayStylePreset {
  id: DisplayStyle;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  descriptionEn: string;
  // How to render in 3D
  frame: {
    type: "flat" | "standing" | "cute";
    baseColor: string;
    accentColor: string;
    hasBase: boolean;       // 台座あり？
    cornerRadius: number;   // 丸み
    glow: number;           // ネオン/発光強度
    scale: [number, number, number]; // 縦横奥行の比
  };
}

export const DISPLAY_STYLES: DisplayStylePreset[] = [
  {
    id: "poster",
    name: "ポスター",
    nameEn: "Poster",
    icon: "🖼️",
    description: "壁に貼るシンプルなポスター",
    descriptionEn: "A simple poster for the wall",
    frame: {
      type: "flat",
      baseColor: "#1a1a2e",
      accentColor: "#a855f7",
      hasBase: false,
      cornerRadius: 0.02,
      glow: 0,
      scale: [0.8, 1.2, 0.03],
    },
  },
  {
    id: "framed",
    name: "額縁",
    nameEn: "Framed",
    icon: "🏞️",
    description: "豪華な額縁に入ったアート風",
    descriptionEn: "An art piece in an ornate frame",
    frame: {
      type: "flat",
      baseColor: "#8b5a2b",
      accentColor: "#fbbf24",
      hasBase: false,
      cornerRadius: 0.04,
      glow: 0,
      scale: [0.9, 1.1, 0.08],
    },
  },
  {
    id: "acrylic_stand",
    name: "アクスタ",
    nameEn: "Acrylic Stand",
    icon: "🪪",
    description: "アクリルスタンド風、透明感のある立て看板",
    descriptionEn: "A translucent standee in acrylic-stand style",
    frame: {
      type: "standing",
      baseColor: "#e0f2fe",
      accentColor: "#0ea5e9",
      hasBase: true,
      cornerRadius: 0.1,
      glow: 0.3,
      scale: [0.5, 0.9, 0.02],
    },
  },
  {
    id: "figure",
    name: "フィギュア",
    nameEn: "Figure",
    icon: "🗿",
    description: "台座付きで本格的なフィギュア風",
    descriptionEn: "An authentic figure look with a base",
    frame: {
      type: "standing",
      baseColor: "#1e293b",
      accentColor: "#f59e0b",
      hasBase: true,
      cornerRadius: 0.15,
      glow: 0.1,
      scale: [0.4, 0.7, 0.15],
    },
  },
  {
    id: "plush",
    name: "ぬいぐるみ",
    nameEn: "Plush",
    icon: "🧸",
    description: "ふわふわの丸みを帯びたぬいぐるみ風",
    descriptionEn: "A soft, rounded plush look",
    frame: {
      type: "cute",
      baseColor: "#fce7f3",
      accentColor: "#ec4899",
      hasBase: false,
      cornerRadius: 0.3,
      glow: 0,
      scale: [0.5, 0.5, 0.4],
    },
  },
  {
    id: "trophy",
    name: "トロフィー",
    nameEn: "Trophy",
    icon: "🏆",
    description: "栄光の推しをトロフィー風に",
    descriptionEn: "Your favorite, presented as a trophy",
    frame: {
      type: "standing",
      baseColor: "#fbbf24",
      accentColor: "#b45309",
      hasBase: true,
      cornerRadius: 0.2,
      glow: 0.4,
      scale: [0.35, 0.6, 0.2],
    },
  },
];

export function getDisplayStyle(id: string): DisplayStylePreset | undefined {
  return DISPLAY_STYLES.find((s) => s.id === id);
}
