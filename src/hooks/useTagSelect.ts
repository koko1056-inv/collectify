
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tag } from "@/types/tag";

export function useTagSelect(category: string, initialValue: string | null) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: allTags = [], refetch } = useQuery<Tag[]>({
    queryKey: ["tags", category],
    queryFn: async () => {
      console.log(`Fetching tags for category: ${category}`);
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("category", category)
        .order("name");

      if (error) {
        console.error(`Error fetching tags for category ${category}:`, error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} tags for category ${category}:`, data);
      return data || [];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // 検索クエリでフィルタリングされたタグリスト
  const filteredTags = searchQuery.trim() === '' 
    ? allTags 
    : allTags.filter(tag => 
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  
  // カテゴリー別のプレースホルダーテキスト
  const getPlaceholderText = () => {
    switch (category) {
      case 'character':
        return 'キャラクターを選択';
      case 'type':
        return 'グッズタイプを選択';
      case 'series':
        return 'グッズシリーズを選択';
      default:
        return '選択してください';
    }
  };

  // 現在選択されているタグを見つける
  const selectedTag = allTags.find(tag => tag.name === initialValue);

  useEffect(() => {
    if (allTags.length > 0) {
      console.log(`[${category}] Available tags (${allTags.length}):`, allTags.map(t => t.name).join(', '));
    }
    if (initialValue) {
      console.log(`[${category}] Current value:`, initialValue);
      console.log(`[${category}] Selected tag:`, selectedTag);
    }
  }, [allTags, initialValue, selectedTag, category]);

  const handleAddNewTag = async (tagName: string) => {
    // キャッシュを完全に無効化して強制的に再取得
    await queryClient.invalidateQueries({ queryKey: ["tags", category] });
    await queryClient.resetQueries({ queryKey: ["tags", category] });
    
    // 強制的にデータを再取得
    await refetch();
  };

  return {
    selectedTag,
    searchQuery,
    setSearchQuery,
    filteredTags,
    isDialogOpen,
    setIsDialogOpen,
    refetch,
    getPlaceholderText,
    handleAddNewTag
  };
}
