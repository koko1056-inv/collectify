import { Box, Home, Store as StoreIcon, Frame } from "lucide-react";

export interface UserItem {
  id: string;
  title: string;
  image: string;
}

export interface BackgroundPreset {
  id: string;
  name: string;
  icon?: any;
  prompt?: string;
  image_url?: string;
  user_id?: string;
  category: string;
}

export const DEFAULT_PRESETS: BackgroundPreset[] = [
  {
    id: "shelf",
    name: "棚",
    icon: Box,
    prompt:
      "木製の棚が並ぶ清潔で明るい展示スペース。シンプルで洗練されたデザイン。自然光が差し込む雰囲気。",
    category: "shelf",
  },
  {
    id: "room",
    name: "部屋",
    icon: Home,
    prompt:
      "おしゃれな部屋のインテリア。壁には装飾があり、床は木目調。温かみのある照明。コレクションルームのような雰囲気。",
    category: "room",
  },
  {
    id: "showcase",
    name: "ショーケース",
    icon: StoreIcon,
    prompt:
      "ガラスのショーケースが並ぶ高級感のある展示スペース。スポットライトが当たる雰囲気。美術館やギャラリーのような空間。",
    category: "showcase",
  },
  {
    id: "display",
    name: "展示台",
    icon: Frame,
    prompt:
      "白い展示台が配置された広々としたギャラリースペース。ミニマルでモダンなデザイン。美しく整理された展示環境。",
    category: "display",
  },
];
