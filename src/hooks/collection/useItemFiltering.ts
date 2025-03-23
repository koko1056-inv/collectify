
import { useMemo } from "react";
import { UserItem } from "@/types";

export function useItemFiltering(
  items: UserItem[],
  selectedTags: string[],
  activeTheme: string | null
) {
  const filteredItems = useMemo(() => {
    let result = [...items];
    
    // タグでフィルタリング
    if (selectedTags.length > 0) {
      result = result.filter(item => 
        selectedTags.every(tag => 
          item.user_item_tags?.some(itemTag => itemTag.tags?.name === tag)
        )
      );
    }
    
    // テーマでフィルタリング
    if (activeTheme !== null) {
      result = result.filter(item => item.theme === activeTheme);
    }
    
    return result;
  }, [items, selectedTags, activeTheme]);

  return { filteredItems };
}
