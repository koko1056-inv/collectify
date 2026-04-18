// AIルーム生成時の絵柄スタイル(リアル/アニメ調 など)
// stylePrompt とは独立して、ビジュアルの "描き方" を指定する

export interface RoomVisualStyle {
  id: string;
  name: string;
  emoji: string;
  description: string;
  prompt: string; // AIに渡す描画スタイルの追加指示
}

export const ROOM_VISUAL_STYLES: RoomVisualStyle[] = [
  {
    id: "anime",
    name: "アニメ調",
    emoji: "✨",
    description: "セル画風の鮮やかな塗り",
    prompt:
      "アニメ調のイラスト。セル画風の鮮やかでクリアな塗り、はっきりとした輪郭線、彩度高め。日本のアニメ作品のような美術背景。",
  },
  {
    id: "realistic",
    name: "リアル",
    emoji: "📸",
    description: "実写のような写真風",
    prompt:
      "フォトリアリスティックな描写。実写写真のような質感、自然光、被写界深度のあるカメラ風表現。素材の質感(布・木・金属)を忠実に再現。",
  },
  {
    id: "watercolor",
    name: "水彩イラスト",
    emoji: "🎨",
    description: "やわらかい手描き風",
    prompt:
      "やわらかい水彩イラスト調。にじみ、淡い色合い、手描きの温かみ、絵本のような優しい雰囲気。",
  },
  {
    id: "pixel",
    name: "ピクセルアート",
    emoji: "🕹️",
    description: "レトロな8/16bit風",
    prompt:
      "ピクセルアート(ドット絵)スタイル。16bit時代のRPG風、限定的なカラーパレット、はっきりとしたピクセル境界。",
  },
  {
    id: "3d_render",
    name: "3Dレンダリング",
    emoji: "🧊",
    description: "Pixar風の立体CG",
    prompt:
      "3DCGレンダリング。Pixarやアニメ映画のような立体感のあるシェーディング、ソフトな陰影、滑らかな表面、グローバルイルミネーション。",
  },
  {
    id: "chibi",
    name: "ちびデフォルメ",
    emoji: "🧸",
    description: "可愛いミニチュア風",
    prompt:
      "ちびデフォルメ・ミニチュア風。丸みを帯びた可愛らしい形状、パステルカラー、ジオラマやドールハウスのような小さな世界観。",
  },
];

export function getVisualStyleById(id: string): RoomVisualStyle | undefined {
  return ROOM_VISUAL_STYLES.find((s) => s.id === id);
}

export const DEFAULT_VISUAL_STYLE_ID = "anime";
