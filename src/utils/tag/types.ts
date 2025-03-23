
import { Tag } from "@/types/tag";

// 循環参照を防ぐために単純化されたタグインターフェース
export interface SimpleTag {
  id: string;
  name: string;
  category?: string;
  created_at?: string;
}

// 単純化されたタグ関連のインターフェースを修正（無限再帰を防止）
export interface SimpleItemTag {
  id: string;
  tag_id: string;
  tags?: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  } | null;
}

// タグごとのアイテムのマップ型
export type ItemsByTagMap = Record<string, any[]>;
