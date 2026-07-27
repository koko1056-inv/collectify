// 推し活ディスプレイ家具プリセット
// 実際の推し活グッズ（棚・台座・ケース・神棚など）をモチーフにした2D家具

export type FurnitureCategory =
  | "shelf"       // 棚
  | "stand"       // 台座・スタンド
  | "case"        // ケース・ボックス
  | "board"       // ボード・フレーム
  | "altar"       // 神棚
  | "hanging";    // 掛けるもの（タペストリーなど）

export type FurnitureStyle =
  | "white"       // 白基調
  | "wood"        // 木目
  | "black"       // ブラック
  | "acrylic"     // アクリル
  | "gold"        // ゴールド
  | "pink";       // ピンク

export interface DisplayFurniturePreset {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  category: FurnitureCategory;
  description: string;
  descriptionEn: string;
  // 初期サイズ（vw, vh）
  widthVw: number;  // 横幅（vw）
  heightVw: number; // 縦幅（vw）基準でアスペクト維持
  // 棚スロット（アイテムを置く位置の参考ガイド、0-1範囲）
  slots: Array<{ x: number; y: number }>;
  // デフォルトのスタイル
  defaultStyle: FurnitureStyle;
}

export const DISPLAY_FURNITURE: DisplayFurniturePreset[] = [
  // === 棚 ===
  {
    id: "shelf_tier2",
    name: "2段棚",
    nameEn: "2-Tier Shelf",
    icon: "🗄️",
    category: "shelf",
    description: "コンパクトな2段の白い棚",
    descriptionEn: "A compact white two-tier shelf",
    widthVw: 18,
    heightVw: 20,
    slots: [
      { x: 0.2, y: 0.25 }, { x: 0.5, y: 0.25 }, { x: 0.8, y: 0.25 },
      { x: 0.2, y: 0.72 }, { x: 0.5, y: 0.72 }, { x: 0.8, y: 0.72 },
    ],
    defaultStyle: "white",
  },
  {
    id: "shelf_tier3",
    name: "3段棚",
    nameEn: "3-Tier Shelf",
    icon: "📚",
    category: "shelf",
    description: "たっぷり飾れる3段の棚",
    descriptionEn: "A three-tier shelf with plenty of display space",
    widthVw: 22,
    heightVw: 26,
    slots: [
      { x: 0.2, y: 0.17 }, { x: 0.5, y: 0.17 }, { x: 0.8, y: 0.17 },
      { x: 0.2, y: 0.48 }, { x: 0.5, y: 0.48 }, { x: 0.8, y: 0.48 },
      { x: 0.2, y: 0.8 }, { x: 0.5, y: 0.8 }, { x: 0.8, y: 0.8 },
    ],
    defaultStyle: "white",
  },
  {
    id: "shelf_wide",
    name: "ワイド棚",
    nameEn: "Wide Shelf",
    icon: "🪟",
    category: "shelf",
    description: "横に長いワイドタイプ",
    descriptionEn: "A long, wide shelf",
    widthVw: 32,
    heightVw: 18,
    slots: [
      { x: 0.12, y: 0.3 }, { x: 0.3, y: 0.3 }, { x: 0.5, y: 0.3 }, { x: 0.7, y: 0.3 }, { x: 0.88, y: 0.3 },
      { x: 0.12, y: 0.78 }, { x: 0.3, y: 0.78 }, { x: 0.5, y: 0.78 }, { x: 0.7, y: 0.78 }, { x: 0.88, y: 0.78 },
    ],
    defaultStyle: "white",
  },
  {
    id: "shelf_floating",
    name: "ウォールシェルフ",
    nameEn: "Wall Shelf",
    icon: "📐",
    category: "shelf",
    description: "壁掛けタイプの横長棚",
    descriptionEn: "A wall-mounted horizontal shelf",
    widthVw: 24,
    heightVw: 5,
    slots: [
      { x: 0.15, y: 0.5 }, { x: 0.4, y: 0.5 }, { x: 0.6, y: 0.5 }, { x: 0.85, y: 0.5 },
    ],
    defaultStyle: "white",
  },

  // === 台座・スタンド ===
  {
    id: "stand_small",
    name: "ミニ台座",
    nameEn: "Small Pedestal",
    icon: "⚪",
    category: "stand",
    description: "1つのアイテムを際立たせる小さな台座",
    descriptionEn: "A small pedestal that spotlights a single item",
    widthVw: 6,
    heightVw: 4,
    slots: [{ x: 0.5, y: 0.4 }],
    defaultStyle: "white",
  },
  {
    id: "stand_pedestal",
    name: "丸台座",
    nameEn: "Round Pedestal",
    icon: "🫧",
    category: "stand",
    description: "円形のディスプレイ台",
    descriptionEn: "A round display stand",
    widthVw: 10,
    heightVw: 8,
    slots: [{ x: 0.5, y: 0.3 }],
    defaultStyle: "white",
  },
  {
    id: "stand_riser",
    name: "ライザー",
    nameEn: "Riser",
    icon: "🔲",
    category: "stand",
    description: "高さを出す四角い台",
    descriptionEn: "A square riser that adds height",
    widthVw: 8,
    heightVw: 6,
    slots: [{ x: 0.5, y: 0.3 }],
    defaultStyle: "acrylic",
  },

  // === アクスタ・ボード ===
  {
    id: "board_acrylic",
    name: "アクスタボード",
    nameEn: "Acrylic Stand Board",
    icon: "🪪",
    category: "board",
    description: "アクリルスタンドを並べるベース",
    descriptionEn: "A base for lining up acrylic stands",
    widthVw: 20,
    heightVw: 4,
    slots: [
      { x: 0.15, y: 0.3 }, { x: 0.35, y: 0.3 }, { x: 0.5, y: 0.3 }, { x: 0.65, y: 0.3 }, { x: 0.85, y: 0.3 },
    ],
    defaultStyle: "acrylic",
  },
  {
    id: "board_badge",
    name: "缶バッジボード",
    nameEn: "Badge Board",
    icon: "🎯",
    category: "board",
    description: "缶バッジを飾るコルクボード",
    descriptionEn: "A cork board for displaying pin badges",
    widthVw: 18,
    heightVw: 14,
    slots: [
      { x: 0.2, y: 0.25 }, { x: 0.5, y: 0.25 }, { x: 0.8, y: 0.25 },
      { x: 0.2, y: 0.55 }, { x: 0.5, y: 0.55 }, { x: 0.8, y: 0.55 },
      { x: 0.2, y: 0.85 }, { x: 0.5, y: 0.85 }, { x: 0.8, y: 0.85 },
    ],
    defaultStyle: "wood",
  },
  {
    id: "board_tapestry",
    name: "タペストリー",
    nameEn: "Tapestry",
    icon: "🎌",
    category: "hanging",
    description: "縦長の布ポスター",
    descriptionEn: "A tall fabric poster",
    widthVw: 10,
    heightVw: 18,
    slots: [{ x: 0.5, y: 0.5 }],
    defaultStyle: "white",
  },

  // === ケース・ボックス ===
  {
    id: "case_glass",
    name: "ガラスケース",
    nameEn: "Glass Case",
    icon: "📦",
    category: "case",
    description: "ホコリから守るガラスケース",
    descriptionEn: "A glass case that keeps dust out",
    widthVw: 14,
    heightVw: 16,
    slots: [
      { x: 0.3, y: 0.4 }, { x: 0.7, y: 0.4 },
      { x: 0.3, y: 0.8 }, { x: 0.7, y: 0.8 },
    ],
    defaultStyle: "acrylic",
  },
  {
    id: "case_box",
    name: "ディスプレイボックス",
    nameEn: "Display Box",
    icon: "🗳️",
    category: "case",
    description: "オープンタイプのディスプレイ箱",
    descriptionEn: "An open-front display box",
    widthVw: 12,
    heightVw: 10,
    slots: [{ x: 0.3, y: 0.5 }, { x: 0.7, y: 0.5 }],
    defaultStyle: "white",
  },

  // === 神棚系（推し祭壇） ===
  {
    id: "altar_small",
    name: "推し祭壇（小）",
    nameEn: "Shrine Small",
    icon: "⛩️",
    category: "altar",
    description: "コンパクトな祭壇・神棚",
    descriptionEn: "A compact shrine altar",
    widthVw: 16,
    heightVw: 22,
    slots: [
      { x: 0.5, y: 0.25 },
      { x: 0.3, y: 0.55 }, { x: 0.7, y: 0.55 },
      { x: 0.2, y: 0.85 }, { x: 0.5, y: 0.85 }, { x: 0.8, y: 0.85 },
    ],
    defaultStyle: "gold",
  },
  {
    id: "altar_grand",
    name: "推し祭壇（豪華）",
    nameEn: "Shrine Grand",
    icon: "🏛️",
    category: "altar",
    description: "キンキラの豪華祭壇",
    descriptionEn: "A lavish, gold-trimmed altar",
    widthVw: 28,
    heightVw: 30,
    slots: [
      { x: 0.5, y: 0.2 },
      { x: 0.25, y: 0.45 }, { x: 0.5, y: 0.45 }, { x: 0.75, y: 0.45 },
      { x: 0.15, y: 0.7 }, { x: 0.35, y: 0.7 }, { x: 0.55, y: 0.7 }, { x: 0.75, y: 0.7 },
      { x: 0.5, y: 0.9 },
    ],
    defaultStyle: "gold",
  },

  // === フレーム ===
  {
    id: "board_frame",
    name: "フォトフレーム",
    nameEn: "Photo Frame",
    icon: "🖼️",
    category: "board",
    description: "写真・ポスター用の額縁",
    descriptionEn: "A frame for photos and posters",
    widthVw: 8,
    heightVw: 10,
    slots: [{ x: 0.5, y: 0.5 }],
    defaultStyle: "wood",
  },
];

export const FURNITURE_CATEGORY_LABELS: Record<FurnitureCategory, { label: string; labelEn: string; icon: string }> = {
  shelf: { label: "棚", labelEn: "Shelves", icon: "🗄️" },
  stand: { label: "台座", labelEn: "Pedestals", icon: "⚪" },
  board: { label: "ボード", labelEn: "Boards", icon: "🪪" },
  case: { label: "ケース", labelEn: "Cases", icon: "📦" },
  altar: { label: "祭壇", labelEn: "Altars", icon: "⛩️" },
  hanging: { label: "壁掛け", labelEn: "Wall hanging", icon: "🎌" },
};

export function getFurnitureById(id: string): DisplayFurniturePreset | undefined {
  return DISPLAY_FURNITURE.find((f) => f.id === id);
}
