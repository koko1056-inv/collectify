import React, { useState } from "react";
import { FilterBar } from "../FilterBar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OfficialItem, Tag } from "@/types";
import { CollectionTabs } from "../CollectionTabs";

export function ProfileCollection({ userId }: { userId: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState("");

  const { data: items = [] } = useQuery<OfficialItem[]>({
    queryKey: ["user-items", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select(`
          *,
          item_tags (
            tags (
              id,
              name
            )
          )
        `)
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OfficialItem[];
    },
  });

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

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

    const matchesContent = !selectedContent || item.content_name === selectedContent;

    return matchesSearch && matchesTags && matchesContent;
  });

  return (
    <div className="space-y-4">
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        selectedContent={selectedContent}
        onContentChange={setSelectedContent}
        tags={allTags}
      />
      <CollectionTabs
        filteredItems={filteredItems}
        selectedTags={selectedTags}
        userId={userId}
      />
    </div>
  );
}
