
// Basic Tag definition
export interface Tag {
  id: string;
  name: string;
  category?: string | null;
  created_at?: string;
  count?: number;
}

// Simple Item Tag structure
export interface SimpleItemTag {
  id: string;
  tag_id: string;
  tags?: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  };
}

// User Items with Tags
export interface UserItemWithTags {
  id: string;
  title: string;
  image: string;
  user_item_tags: {
    tags: Tag;
  }[];
}

// Grouped items by tag
export interface ItemsGroupedByTag {
  group_name: string;
  items: any[];
}
