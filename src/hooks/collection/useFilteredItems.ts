import { useState } from "react";
import { OfficialItem, Tag } from "@/types";

export function useFilteredItems(items: OfficialItem[], userInterests?: string[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filteredItems = items.filter((item) => {
    const matchesSearch = searchQuery
      ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.artist?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (item.anime?.toLowerCase() || "").includes(searchQuery.toLowerCase())
      : true;
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => 
        item.item_tags?.some(itemTag => itemTag.tags?.name === tag)
      );
    
    return matchesSearch && matchesTags;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!userInterests || userInterests.length === 0) return 0;

    const aMatchCount = a.item_tags?.filter(
      itemTag => userInterests.includes(itemTag.tags?.name || "")
    ).length || 0;
    const bMatchCount = b.item_tags?.filter(
      itemTag => userInterests.includes(itemTag.tags?.name || "")
    ).length || 0;

    if (aMatchCount !== bMatchCount) {
      return bMatchCount - aMatchCount;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return {
    searchQuery,
    selectedTags,
    setSearchQuery,
    setSelectedTags,
    sortedItems,
  };
}