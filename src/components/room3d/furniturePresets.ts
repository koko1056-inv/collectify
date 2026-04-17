// 家具アセットのプリセット定義
export interface FurniturePreset {
  id: string;
  name: string;
  nameEn: string;
  category: 'chair' | 'table' | 'shelf' | 'sofa' | 'lamp' | 'decoration' | 'bed' | 'gaming' | 'kawaii';
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
  // === ベッド ===
  {
    id: 'bed_single',
    name: 'シングルベッド',
    nameEn: 'Single Bed',
    category: 'bed',
    icon: '🛏️',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'box', position: [0, 0.25, 0], args: [1.0, 0.3, 2.0], color: '#f5e6d3' },
        { type: 'box', position: [0, 0.5, 0], args: [0.95, 0.15, 1.95], color: '#fff5e8' },
        { type: 'box', position: [0, 0.4, -0.85], args: [0.9, 0.2, 0.3], color: '#f9c5c5' },
        { type: 'box', position: [0, 0.75, -0.95], args: [1.05, 0.8, 0.08], color: '#8a6a5a' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  {
    id: 'bed_canopy',
    name: '天蓋ベッド',
    nameEn: 'Canopy Bed',
    category: 'bed',
    icon: '👸',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'box', position: [0, 0.25, 0], args: [1.2, 0.3, 2.2], color: '#fce7f3' },
        { type: 'box', position: [0, 0.55, 0], args: [1.15, 0.2, 2.15], color: '#fff0f6' },
        { type: 'cylinder', position: [-0.55, 1.3, -1.0], args: [0.04, 0.04, 1.8], color: '#a855f7' },
        { type: 'cylinder', position: [0.55, 1.3, -1.0], args: [0.04, 0.04, 1.8], color: '#a855f7' },
        { type: 'cylinder', position: [-0.55, 1.3, 1.0], args: [0.04, 0.04, 1.8], color: '#a855f7' },
        { type: 'cylinder', position: [0.55, 1.3, 1.0], args: [0.04, 0.04, 1.8], color: '#a855f7' },
        { type: 'box', position: [0, 2.2, 0], args: [1.25, 0.04, 2.25], color: '#f9a8d4' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  // === ゲーミング系 ===
  {
    id: 'gaming_setup',
    name: 'ゲーミングPC',
    nameEn: 'Gaming PC',
    category: 'gaming',
    icon: '💻',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'box', position: [-0.2, 0.35, 0], args: [0.25, 0.5, 0.4], color: '#111' },
        { type: 'box', position: [-0.2, 0.35, 0.21], args: [0.23, 0.48, 0.005], color: '#a855f7' },
        { type: 'box', position: [0.3, 0.35, 0], args: [0.6, 0.35, 0.04], color: '#0a0a0a' },
        { type: 'box', position: [0.3, 0.35, -0.02], args: [0.55, 0.31, 0.01], color: '#4338ca' },
        { type: 'cylinder', position: [0.3, 0.1, 0], args: [0.08, 0.1, 0.03], color: '#222' },
        { type: 'box', position: [0.35, 0.06, 0.15], args: [0.35, 0.02, 0.12], color: '#1a1a2e' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  {
    id: 'gaming_console',
    name: 'ゲーム機',
    nameEn: 'Game Console',
    category: 'gaming',
    icon: '🎮',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'box', position: [0, 0.05, 0], args: [0.35, 0.1, 0.25], color: '#1a1a2e' },
        { type: 'box', position: [0, 0.05, 0.13], args: [0.3, 0.06, 0.01], color: '#22c55e' },
        { type: 'box', position: [-0.1, 0.15, 0.05], args: [0.16, 0.04, 0.1], color: '#333' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  {
    id: 'gaming_arcade',
    name: 'アーケード筐体',
    nameEn: 'Arcade Cabinet',
    category: 'gaming',
    icon: '🕹️',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'box', position: [0, 0.75, 0], args: [0.7, 1.5, 0.6], color: '#ef4444' },
        { type: 'box', position: [0, 1.2, 0.32], args: [0.55, 0.5, 0.02], color: '#0a0a0a' },
        { type: 'box', position: [0, 1.2, 0.33], args: [0.5, 0.45, 0.005], color: '#fbbf24' },
        { type: 'box', position: [0, 0.8, 0.31], args: [0.5, 0.15, 0.04], color: '#1a1a1a' },
        { type: 'cylinder', position: [-0.12, 0.82, 0.36], args: [0.03, 0.03, 0.06], color: '#dc2626' },
        { type: 'cylinder', position: [0.12, 0.82, 0.36], args: [0.03, 0.03, 0.06], color: '#3b82f6' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  // === かわいい系 ===
  {
    id: 'kawaii_plush_pile',
    name: 'ぬいぐるみ山',
    nameEn: 'Plush Pile',
    category: 'kawaii',
    icon: '🧸',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'sphere', position: [0, 0.15, 0], args: [0.15], color: '#f9a8d4' },
        { type: 'sphere', position: [0.18, 0.12, 0.1], args: [0.13], color: '#fcd34d' },
        { type: 'sphere', position: [-0.15, 0.14, -0.08], args: [0.14], color: '#93c5fd' },
        { type: 'sphere', position: [0.05, 0.32, 0], args: [0.12], color: '#c4b5fd' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  {
    id: 'kawaii_cat_bed',
    name: '猫のベッド',
    nameEn: 'Cat Bed',
    category: 'kawaii',
    icon: '🐱',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'cylinder', position: [0, 0.08, 0], args: [0.3, 0.3, 0.16], color: '#fce7f3' },
        { type: 'cylinder', position: [0, 0.14, 0], args: [0.22, 0.22, 0.04], color: '#fbcfe8' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  {
    id: 'kawaii_donut_chair',
    name: 'ドーナツチェア',
    nameEn: 'Donut Chair',
    category: 'kawaii',
    icon: '🍩',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'cylinder', position: [0, 0.2, 0], args: [0.45, 0.45, 0.25], color: '#fbbf24' },
        { type: 'cylinder', position: [0, 0.2, 0], args: [0.18, 0.18, 0.26], color: '#1e1e30' },
        { type: 'cylinder', position: [0, 0.35, 0], args: [0.43, 0.43, 0.04], color: '#f9a8d4' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  {
    id: 'kawaii_balloon',
    name: 'バルーン',
    nameEn: 'Balloon',
    category: 'kawaii',
    icon: '🎈',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'sphere', position: [0, 1.2, 0], args: [0.2], color: '#ef4444' },
        { type: 'cylinder', position: [0, 0.5, 0], args: [0.005, 0.005, 1.3], color: '#888' },
        { type: 'box', position: [0, 0, 0], args: [0.08, 0.02, 0.08], color: '#666' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  // === 追加の装飾 ===
  {
    id: 'deco_tv',
    name: 'テレビ',
    nameEn: 'TV',
    category: 'decoration',
    icon: '📺',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'box', position: [0, 0, 0], args: [1.0, 0.6, 0.06], color: '#0a0a0a' },
        { type: 'box', position: [0, 0, 0.035], args: [0.93, 0.53, 0.005], color: '#1a1a3e' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['back_wall', 'left_wall'],
  },
  {
    id: 'deco_clock',
    name: '壁掛け時計',
    nameEn: 'Wall Clock',
    category: 'decoration',
    icon: '🕐',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'cylinder', position: [0, 0, 0], args: [0.2, 0.2, 0.04], color: '#f5f5f5' },
        { type: 'cylinder', position: [0, 0, 0.025], args: [0.17, 0.17, 0.005], color: '#1a1a1a' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['back_wall', 'left_wall'],
  },
  {
    id: 'deco_vinyl',
    name: 'レコード',
    nameEn: 'Vinyl Record',
    category: 'decoration',
    icon: '💿',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'cylinder', position: [0, 0, 0], args: [0.25, 0.25, 0.02], color: '#0a0a0a' },
        { type: 'cylinder', position: [0, 0, 0.015], args: [0.08, 0.08, 0.005], color: '#ef4444' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['back_wall', 'left_wall'],
  },
  {
    id: 'deco_neon_sign',
    name: 'ネオンサイン',
    nameEn: 'Neon Sign',
    category: 'decoration',
    icon: '💡',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'box', position: [0, 0, 0], args: [0.7, 0.3, 0.04], color: '#0a0a0a' },
        { type: 'box', position: [0, 0, 0.025], args: [0.65, 0.25, 0.01], color: '#ec4899' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['back_wall', 'left_wall'],
  },
  {
    id: 'deco_aquarium',
    name: '水槽',
    nameEn: 'Aquarium',
    category: 'decoration',
    icon: '🐠',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'box', position: [0, 0.25, 0], args: [0.8, 0.5, 0.3], color: '#bae6fd' },
        { type: 'box', position: [0, 0.05, 0], args: [0.82, 0.1, 0.32], color: '#0c4a6e' },
        { type: 'sphere', position: [-0.15, 0.2, 0], args: [0.04], color: '#f97316' },
        { type: 'sphere', position: [0.1, 0.3, 0.05], args: [0.03], color: '#fbbf24' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  {
    id: 'lamp_neon',
    name: 'ネオンランプ',
    nameEn: 'Neon Lamp',
    category: 'lamp',
    icon: '🌈',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'cylinder', position: [0, 0.03, 0], args: [0.15, 0.15, 0.04], color: '#0a0a0a' },
        { type: 'cylinder', position: [0, 0.5, 0], args: [0.02, 0.02, 1.0], color: '#a855f7' },
        { type: 'sphere', position: [0, 1.0, 0], args: [0.08], color: '#ec4899' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  {
    id: 'table_coffee',
    name: 'コーヒーテーブル',
    nameEn: 'Coffee Table',
    category: 'table',
    icon: '☕',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'box', position: [0, 0.4, 0], args: [1.0, 0.06, 0.5], color: '#c8a978' },
        { type: 'cylinder', position: [-0.4, 0.2, 0.2], args: [0.03, 0.03, 0.38], color: '#222' },
        { type: 'cylinder', position: [0.4, 0.2, 0.2], args: [0.03, 0.03, 0.38], color: '#222' },
        { type: 'cylinder', position: [-0.4, 0.2, -0.2], args: [0.03, 0.03, 0.38], color: '#222' },
        { type: 'cylinder', position: [0.4, 0.2, -0.2], args: [0.03, 0.03, 0.38], color: '#222' },
      ],
    },
    defaultScale: 1,
    allowedPlacements: ['floor'],
  },
  {
    id: 'shelf_display',
    name: 'ディスプレイケース',
    nameEn: 'Display Case',
    category: 'shelf',
    icon: '🏆',
    geometry: {
      type: 'composite',
      parts: [
        { type: 'box', position: [0, 0.9, 0], args: [0.8, 1.8, 0.35], color: '#d4d4d8' },
        { type: 'box', position: [0, 0.9, 0.17], args: [0.75, 1.75, 0.01], color: '#dbeafe' },
        { type: 'box', position: [0, 0.3, 0], args: [0.72, 0.04, 0.32], color: '#a1a1aa' },
        { type: 'box', position: [0, 0.75, 0], args: [0.72, 0.04, 0.32], color: '#a1a1aa' },
        { type: 'box', position: [0, 1.2, 0], args: [0.72, 0.04, 0.32], color: '#a1a1aa' },
        { type: 'box', position: [0, 1.65, 0], args: [0.72, 0.04, 0.32], color: '#a1a1aa' },
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
  { id: 'bed', name: 'ベッド', nameEn: 'Beds', icon: '🛏️' },
  { id: 'lamp', name: 'ランプ', nameEn: 'Lamps', icon: '💡' },
  { id: 'gaming', name: 'ゲーミング', nameEn: 'Gaming', icon: '🎮' },
  { id: 'kawaii', name: 'かわいい', nameEn: 'Kawaii', icon: '🎀' },
  { id: 'decoration', name: '装飾', nameEn: 'Decorations', icon: '🪴' },
] as const;

export function getFurnitureByCategory(category: string): FurniturePreset[] {
  return FURNITURE_PRESETS.filter((f) => f.category === category);
}
