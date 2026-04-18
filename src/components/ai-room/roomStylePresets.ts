// AI ルーム生成用スタイルプリセット
// 各プリセットは LLM に渡すプロンプトの一部 (stylePrompt) と UI 表示用のメタ情報を持つ

export interface RoomStylePreset {
  id: string;
  name: string;
  emoji: string;
  tagline: string;          // UIに表示する短いキャッチ
  gradient: string;         // カードのグラデ (tailwind from-to)
  prompt: string;           // AIに送るスタイル説明
}

export const ROOM_STYLE_PRESETS: RoomStylePreset[] = [
  {
    id: "pastel_kawaii",
    name: "パステル夢かわ",
    emoji: "🌸",
    tagline: "ふわふわピンク、夢空間",
    gradient: "from-pink-300 via-fuchsia-300 to-pink-400",
    prompt:
      "パステルピンク、ライラック、ミルキーホワイトの夢かわいい部屋。ふわふわのクッション、ハート型のラグ、リボン装飾。柔らかい光と、窓から差し込む温かい日差し。ドリーミーで甘い雰囲気。",
  },
  {
    id: "cyber_neon",
    name: "サイバーネオン",
    emoji: "🌃",
    tagline: "紫ネオンが輝く夜空間",
    gradient: "from-purple-500 via-fuchsia-500 to-indigo-600",
    prompt:
      "夜の街を見下ろすネオンサイバー部屋。紫・マゼンタ・シアンのネオンライト、黒とメタリックのインテリア、RGBライティング。窓からは煌めく都市の夜景。未来的でクールな雰囲気。",
  },
  {
    id: "mint_cafe",
    name: "ミントカフェ",
    emoji: "🍃",
    tagline: "木漏れ日とグリーン",
    gradient: "from-emerald-300 via-teal-300 to-green-400",
    prompt:
      "ミントグリーンと木目の温かいカフェ風部屋。観葉植物、木のテーブル、アイアン脚の椅子。窓からの自然光、ハンギングプラント、シンプルでオーガニックな雰囲気。",
  },
  {
    id: "dark_academia",
    name: "ダークアカデミア",
    emoji: "📚",
    tagline: "本棚と深緑の書斎",
    gradient: "from-emerald-800 via-slate-700 to-amber-700",
    prompt:
      "深緑と木の書斎風ダークアカデミア部屋。天井までの本棚、革張りの椅子、真鍮のデスクランプ、ペルシャ絨毯。暖かいランプの光、落ち着いた大人の雰囲気。",
  },
  {
    id: "japanese_modern",
    name: "和モダン",
    emoji: "⛩️",
    tagline: "畳と障子、桜舞う",
    gradient: "from-rose-300 via-red-400 to-orange-500",
    prompt:
      "畳と障子の和モダン部屋。低い木製の棚、生花、掛け軸、障子から差し込む柔らかい光、桜の花びらが舞う縁側。静謐で洗練された日本の美。",
  },
  {
    id: "european_antique",
    name: "ヨーロピアン",
    emoji: "🏰",
    tagline: "アンティークと金装飾",
    gradient: "from-amber-400 via-rose-300 to-stone-400",
    prompt:
      "ヨーロピアンアンティーク風の豪華な部屋。彫刻された木の棚、大理石のマントルピース、金装飾の鏡、クラシカルな絵画。クリスタルシャンデリア、気品ある雰囲気。",
  },
  {
    id: "gaming_rgb",
    name: "ゲーミング部屋",
    emoji: "🎮",
    tagline: "RGB全開の黒基調",
    gradient: "from-green-500 via-lime-500 to-emerald-600",
    prompt:
      "ハイエンドゲーミング部屋。黒を基調に、RGBライティングが部屋全体を照らす。ゲーミングチェア、マルチモニター、LEDテープ、メカニカルキーボード。エネルギッシュで現代的。",
  },
  {
    id: "ocean_resort",
    name: "オーシャンリゾート",
    emoji: "🌊",
    tagline: "海辺の爽やかリゾート",
    gradient: "from-sky-300 via-cyan-300 to-blue-400",
    prompt:
      "海辺のリゾート風部屋。白と水色、ラタンの家具、リネンのカーテン、貝殻や流木のインテリア。窓の外には青い海。爽やかで開放的、リラックスした雰囲気。",
  },
];

export function getStylePresetById(id: string): RoomStylePreset | undefined {
  return ROOM_STYLE_PRESETS.find((p) => p.id === id);
}
