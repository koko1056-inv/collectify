// 家具アセットのプリセット定義
export interface FurniturePreset {
  id: string;
  name: string;
  nameEn: string;
  category: 'chair' | 'table' | 'shelf' | 'sofa' | 'lamp' | 'decoration';
  icon: string;
  // 3Dジオメトリ定義
  geometry: {
    type: 'box' | 'cylinder' | 'composite';
    // compositeの場合は複数のパーツで構成
    parts?: Array<{
      type: 'box' | 'cylinder' | 'sphere';
      position: [number, number, number];
      args: number[];
      color: string;
    }>;
    // 単一ジオメトリの場合
    args?: number[];
    color?: string;
  };
  // デフォルトサイズ（スケール）
  defaultScale: number;
  // 配置可能な場所
  allowedPlacements: ('floor' | 'back_wall' | 'left_wall')[];
}

export const FURNITURE_PRESETS: FurniturePreset[] = [
  // 椅子
  {
    id: 'chair_simple',
    name: 'シンプルチェア',
    nameEn: 'Simple Chair',
    category: 'chair',
    icon: '🪑',
    geometry: {
      type: 'composite',
      parts: [
        // 座面
        { type: 'box', position: [0, 0.45, 0], args: [0.5, 0.08, 0.5], color: '#5a4a3a' },
        // 背もたれ
        { type: 'box', position: [0, 0.85, -0.22], args: [0.5, 0.7, 0.08], color: '#5a4a3a' },
        // 脚（4本）
        { type: 'cylinder', position: [-0.18, 0.2, -0.18], args: [0.03, 0.03, 0.4], color: '#4a3a2a' },
        { type: 'cylinder', position: [0.18, 0.2, -0.18], args: [0.03, 0.03, 0.4], color: '#4a3a2a' },
        { type: 'cylinder', position: [-0.18, 0.2, 0.18], args: [0.03, 0.03, 0.4], color: '#4a3a2a' },
        { type: 'cylinder', position: [0.18, 0.2, 0.18], args: [0.03, 0.03, 0.4], color: '#4a3a2a' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  {
    id: 'chair_gaming',
    name: 'ゲーミングチェア',
    nameEn: 'Gaming Chair',
    category: 'chair',
    icon: '🎮',
    geometry: {
      type: 'composite',
      parts: [
        // 座面
        { type: 'box', position: [0, 0.5, 0], args: [0.55, 0.1, 0.55], color: '#1a1a2e' },
        // 背もたれ
        { type: 'box', position: [0, 1.0, -0.25], args: [0.55, 0.9, 0.1], color: '#1a1a2e' },
        // アームレスト
        { type: 'box', position: [-0.32, 0.65, 0], args: [0.06, 0.2, 0.4], color: '#2a2a4e' },
        { type: 'box', position: [0.32, 0.65, 0], args: [0.06, 0.2, 0.4], color: '#2a2a4e' },
        // 脚部（キャスター付きベース）
        { type: 'cylinder', position: [0, 0.25, 0], args: [0.08, 0.08, 0.5], color: '#333' },
        { type: 'cylinder', position: [0, 0.05, 0], args: [0.35, 0.35, 0.08], color: '#333' },
        // アクセントライン
        { type: 'box', position: [0, 1.0, -0.31], args: [0.1, 0.7, 0.02], color: '#ff4444' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  // テーブル
  {
    id: 'table_desk',
    name: 'デスク',
    nameEn: 'Desk',
    category: 'table',
    icon: '🖥️',
    geometry: {
      type: 'composite',
      parts: [
        // 天板
        { type: 'box', position: [0, 0.75, 0], args: [1.2, 0.05, 0.6], color: '#6a5a4a' },
        // 脚
        { type: 'box', position: [-0.55, 0.35, 0], args: [0.05, 0.7, 0.55], color: '#5a4a3a' },
        { type: 'box', position: [0.55, 0.35, 0], args: [0.05, 0.7, 0.55], color: '#5a4a3a' },
        // 引き出し
        { type: 'box', position: [0.4, 0.55, 0], args: [0.3, 0.12, 0.5], color: '#5a4a3a' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  {
    id: 'table_round',
    name: 'ラウンドテーブル',
    nameEn: 'Round Table',
    category: 'table',
    icon: '⭕',
    geometry: {
      type: 'composite',
      parts: [
        // 天板
        { type: 'cylinder', position: [0, 0.7, 0], args: [0.5, 0.5, 0.05], color: '#7a6a5a' },
        // 脚
        { type: 'cylinder', position: [0, 0.35, 0], args: [0.08, 0.08, 0.7], color: '#5a4a3a' },
        // ベース
        { type: 'cylinder', position: [0, 0.03, 0], args: [0.35, 0.35, 0.06], color: '#5a4a3a' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  // 棚
  {
    id: 'shelf_bookshelf',
    name: '本棚',
    nameEn: 'Bookshelf',
    category: 'shelf',
    icon: '📚',
    geometry: {
      type: 'composite',
      parts: [
        // 外枠（左右）
        { type: 'box', position: [-0.45, 0.9, 0], args: [0.05, 1.8, 0.35], color: '#5a4a3a' },
        { type: 'box', position: [0.45, 0.9, 0], args: [0.05, 1.8, 0.35], color: '#5a4a3a' },
        // 棚板（5段）
        { type: 'box', position: [0, 0.05, 0], args: [0.9, 0.04, 0.35], color: '#5a4a3a' },
        { type: 'box', position: [0, 0.45, 0], args: [0.9, 0.04, 0.35], color: '#5a4a3a' },
        { type: 'box', position: [0, 0.85, 0], args: [0.9, 0.04, 0.35], color: '#5a4a3a' },
        { type: 'box', position: [0, 1.25, 0], args: [0.9, 0.04, 0.35], color: '#5a4a3a' },
        { type: 'box', position: [0, 1.65, 0], args: [0.9, 0.04, 0.35], color: '#5a4a3a' },
        // 背板
        { type: 'box', position: [0, 0.9, -0.16], args: [0.85, 1.75, 0.03], color: '#4a3a2a' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  {
    id: 'shelf_wall',
    name: 'ウォールシェルフ',
    nameEn: 'Wall Shelf',
    category: 'shelf',
    icon: '🏠',
    geometry: {
      type: 'composite',
      parts: [
        // 棚板
        { type: 'box', position: [0, 0, 0], args: [0.8, 0.04, 0.2], color: '#6a5a4a' },
        // ブラケット
        { type: 'box', position: [-0.35, -0.08, 0.08], args: [0.04, 0.12, 0.04], color: '#333' },
        { type: 'box', position: [0.35, -0.08, 0.08], args: [0.04, 0.12, 0.04], color: '#333' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['back_wall', 'left_wall'],
  },
  // ソファ
  {
    id: 'sofa_simple',
    name: 'ソファ',
    nameEn: 'Sofa',
    category: 'sofa',
    icon: '🛋️',
    geometry: {
      type: 'composite',
      parts: [
        // 座面
        { type: 'box', position: [0, 0.35, 0], args: [1.4, 0.3, 0.7], color: '#4a5a7a' },
        // 背もたれ
        { type: 'box', position: [0, 0.65, -0.28], args: [1.4, 0.5, 0.15], color: '#4a5a7a' },
        // アームレスト
        { type: 'box', position: [-0.62, 0.45, 0], args: [0.12, 0.4, 0.6], color: '#4a5a7a' },
        { type: 'box', position: [0.62, 0.45, 0], args: [0.12, 0.4, 0.6], color: '#4a5a7a' },
        // 脚
        { type: 'cylinder', position: [-0.55, 0.08, 0.25], args: [0.05, 0.05, 0.16], color: '#333' },
        { type: 'cylinder', position: [0.55, 0.08, 0.25], args: [0.05, 0.05, 0.16], color: '#333' },
        { type: 'cylinder', position: [-0.55, 0.08, -0.25], args: [0.05, 0.05, 0.16], color: '#333' },
        { type: 'cylinder', position: [0.55, 0.08, -0.25], args: [0.05, 0.05, 0.16], color: '#333' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  // ランプ
  {
    id: 'lamp_floor',
    name: 'フロアランプ',
    nameEn: 'Floor Lamp',
    category: 'lamp',
    icon: '💡',
    geometry: {
      type: 'composite',
      parts: [
        // ベース
        { type: 'cylinder', position: [0, 0.03, 0], args: [0.2, 0.2, 0.06], color: '#333' },
        // ポール
        { type: 'cylinder', position: [0, 0.8, 0], args: [0.03, 0.03, 1.5], color: '#444' },
        // シェード（上広がりの円錐）
        { type: 'cylinder', position: [0, 1.5, 0], args: [0.15, 0.25, 0.3], color: '#e8d4a8' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  {
    id: 'lamp_desk',
    name: 'デスクランプ',
    nameEn: 'Desk Lamp',
    category: 'lamp',
    icon: '🔦',
    geometry: {
      type: 'composite',
      parts: [
        // ベース
        { type: 'cylinder', position: [0, 0.02, 0], args: [0.12, 0.12, 0.04], color: '#2a2a2a' },
        // アーム
        { type: 'cylinder', position: [0, 0.2, 0], args: [0.02, 0.02, 0.35], color: '#333' },
        { type: 'cylinder', position: [0.08, 0.38, 0], args: [0.02, 0.02, 0.2], color: '#333' },
        // シェード
        { type: 'cylinder', position: [0.15, 0.42, 0], args: [0.06, 0.1, 0.12], color: '#ffcc00' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  // 装飾
  {
    id: 'deco_plant',
    name: '観葉植物',
    nameEn: 'Plant',
    category: 'decoration',
    icon: '🪴',
    geometry: {
      type: 'composite',
      parts: [
        // 鉢
        { type: 'cylinder', position: [0, 0.15, 0], args: [0.15, 0.12, 0.3], color: '#8b5a3a' },
        // 土
        { type: 'cylinder', position: [0, 0.28, 0], args: [0.13, 0.13, 0.04], color: '#4a3a2a' },
        // 葉（球体で表現）
        { type: 'sphere', position: [0, 0.55, 0], args: [0.25], color: '#2a6a2a' },
        { type: 'sphere', position: [0.1, 0.65, 0.05], args: [0.18], color: '#3a7a3a' },
        { type: 'sphere', position: [-0.1, 0.6, -0.05], args: [0.2], color: '#2a5a2a' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  {
    id: 'deco_poster',
    name: 'ポスター',
    nameEn: 'Poster',
    category: 'decoration',
    icon: '🖼️',
    geometry: {
      type: 'composite',
      parts: [
        // フレーム
        { type: 'box', position: [0, 0, 0], args: [0.6, 0.8, 0.03], color: '#2a2a2a' },
        // ポスター面
        { type: 'box', position: [0, 0, 0.016], args: [0.55, 0.75, 0.01], color: '#4a6a8a' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['back_wall', 'left_wall'],
  },
  {
    id: 'deco_rug',
    name: 'ラグ',
    nameEn: 'Rug',
    category: 'decoration',
    icon: '🟫',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'box', position: [0, 0.01, 0], args: [1.5, 0.02, 1], color: '#8a6a5a' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
];

// カテゴリ別にグループ化
export const FURNITURE_CATEGORIES = [
  { id: 'chair', name: '椅子', nameEn: 'Chairs', icon: '🪑' },
  { id: 'table', name: 'テーブル', nameEn: 'Tables', icon: '🖥️' },
  { id: 'shelf', name: '棚', nameEn: 'Shelves', icon: '📚' },
  { id: 'sofa', name: 'ソファ', nameEn: 'Sofas', icon: '🛋️' },
  { id: 'lamp', name: 'ランプ', nameEn: 'Lamps', icon: '💡' },
  { id: 'decoration', name: '装飾', nameEn: 'Decorations', icon: '🪴' },
] as const;

export function getFurnitureByCategory(category: string): FurniturePreset[] {
  return FURNITURE_PRESETS.filter((f) => f.category === category);
}
