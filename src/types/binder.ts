export interface Binder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface BinderPage {
  id: string;
  binder_id: string | null;
  user_id: string;
  title: string;
  background_image: string | null;
  background_color: string;
  page_order: number;
  binder_type: 'free_layout' | 'card_pocket';
  layout_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BinderItem {
  id: string;
  binder_page_id: string;
  user_item_id: string | null;
  official_item_id: string | null;
  custom_image_url: string | null;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
  created_at: string;
}

export interface BinderDecoration {
  id: string;
  binder_page_id: string;
  decoration_type: 'sticker' | 'frame' | 'text';
  content: string | null;
  position_x: number;
  position_y: number;
  width: number | null;
  height: number | null;
  rotation: number;
  z_index: number;
  style_config: Record<string, any> | null;
  created_at: string;
}

export interface BinderItemWithData extends BinderItem {
  item_data?: {
    id: string;
    title: string;
    image: string;
  };
}

export type DecorationTool = 'select' | 'item' | 'sticker' | 'frame' | 'text' | 'background';

export interface StickerPreset {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  svg_data: string | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
}

export interface FramePreset {
  id: string;
  name: string;
  category: string;
  border_style: string;
  corner_radius: number;
  padding: number;
  shadow_style: string | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
}
