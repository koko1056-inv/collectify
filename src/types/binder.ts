export interface BinderPage {
  id: string;
  user_id: string;
  title: string;
  background_image: string | null;
  background_color: string;
  page_order: number;
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
