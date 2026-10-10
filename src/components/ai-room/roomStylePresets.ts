// AI ルーム生成用スタイルプリセット
// 各プリセットは LLM に渡すプロンプトの一部 (stylePrompt) と UI 表示用のメタ情報を持つ
// 以前は UI 用に絵文字（🌸🌃…）と pink→fuchsia などのグラデーションを持っていたが、
// 端末ごとに絵柄が変わり、色もアプリのテーマと喧嘩していた。lucide のアイコン1つにした。
import { BookOpen, Building2, Castle, Cloud, Coffee, Flower2, Gamepad2, Waves, type LucideIcon } from "lucide-react";

export interface RoomStylePreset {
  id: string;
  name: string;
  icon: LucideIcon;         // UI に出す印（以前は絵文字＋虹色グラデのカードだった）
  tagline: string;          // UIに表示する短いキャッチ
  prompt: string;           // AIに送るスタイル説明
}

export const ROOM_STYLE_PRESETS: RoomStylePreset[] = [
  {
    id: "pastel_kawaii",
    name: "パステル夢かわ",
    icon: Cloud,
    tagline: "ふわふわピンク、夢空間",
    prompt:
      "パステルピンク、ライラック、ミルキーホワイトの夢かわいい部屋。ふわふわのクッション、ハート型のラグ、リボン装飾。柔らかい光と、窓から差し込む温かい日差し。ドリーミーで甘い雰囲気。",
  },
  {
    id: "cyber_neon",
    name: "サイバーネオン",
    icon: Building2,
    tagline: "紫ネオンが輝く夜空間",
    prompt:
      "夜の街を見下ろすネオンサイバー部屋。紫・マゼンタ・シアンのネオンライト、黒とメタリックのインテリア、RGBライティング。窓からは煌めく都市の夜景。未来的でクールな雰囲気。",
  },
  {
    id: "mint_cafe",
    name: "ミントカフェ",
    icon: Coffee,
    tagline: "木漏れ日とグリーン",
    prompt:
      "ミントグリーンと木目の温かいカフェ風部屋。観葉植物、木のテーブル、アイアン脚の椅子。窓からの自然光、ハンギングプラント、シンプルでオーガニックな雰囲気。",
  },
  {
    id: "dark_academia",
    name: "ダークアカデミア",
    icon: BookOpen,
    tagline: "本棚と深緑の書斎",
    prompt:
      "深緑と木の書斎風ダークアカデミア部屋。天井までの本棚、革張りの椅子、真鍮のデスクランプ、ペルシャ絨毯。暖かいランプの光、落ち着いた大人の雰囲気。",
  },
  {
    id: "japanese_modern",
    name: "和モダン",
    icon: Flower2,
    tagline: "畳と障子、桜舞う",
    prompt:
      "畳と障子の和モダン部屋。低い木製の棚、生花、掛け軸、障子から差し込む柔らかい光、桜の花びらが舞う縁側。静謐で洗練された日本の美。",
  },
  {
    id: "european_antique",
    name: "ヨーロピアン",
    icon: Castle,
    tagline: "アンティークと金装飾",
    prompt:
      "ヨーロピアンアンティーク風の豪華な部屋。彫刻された木の棚、大理石のマントルピース、金装飾の鏡、クラシカルな絵画。クリスタルシャンデリア、気品ある雰囲気。",
  },
  {
    id: "gaming_rgb",
    name: "ゲーミング部屋",
    icon: Gamepad2,
    tagline: "RGB全開の黒基調",
    prompt:
      "ハイエンドゲーミング部屋。黒を基調に、RGBライティングが部屋全体を照らす。ゲーミングチェア、マルチモニター、LEDテープ、メカニカルキーボード。エネルギッシュで現代的。",
  },
  {
    id: "ocean_resort",
    name: "オーシャンリゾート",
    icon: Waves,
    tagline: "海辺の爽やかリゾート",
    prompt:
      "海辺のリゾート風部屋。白と水色、ラタンの家具、リネンのカーテン、貝殻や流木のインテリア。窓の外には青い海。爽やかで開放的、リラックスした雰囲気。",
  },
];

export function getStylePresetById(id: string): RoomStylePreset | undefined {
  return ROOM_STYLE_PRESETS.find((p) => p.id === id);
}
