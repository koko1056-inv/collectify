
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addTagToItem, removeTagFromItem } from "@/utils/tag/tag-mutations";
import { getTagsForItem } from "@/utils/tag/tag-queries";
import { searchTagsByCategory, getTagsByCategory } from "@/utils/tag/tag-search";
import { Tag } from "@/types/tag";

export function useTagManage(itemId?: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [characterTags, setCharacterTags] = useState<string[]>([]);
  const [typeTags, setTypeTags] = useState<string[]>([]);
  const [seriesTags, setSeriesTags] = useState<string[]>([]);
  const [contentName, setContentName] = useState<string>("");
  const [availableContents, setAvailableContents] = useState<{id: string, name: string}[]>([]);
  const [searchResults, setSearchResults] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // アイテムのタグを取得
  const fetchItemTags = async () => {
    if (!itemId) return;
    
    setIsLoading(true);
    try {
      const tags = await getTagsForItem(itemId);
      
      // カテゴリー別にタグを分類
      const characters: string[] = [];
      const types: string[] = [];
      const series: string[] = [];
      
      tags.forEach(tag => {
        if (!tag.tags) return;
        
        const tagName = tag.tags.name;
        const category = tag.tags.category;
        
        if (category === "character") {
          characters.push(tagName);
        } else if (category === "type") {
          types.push(tagName);
        } else if (category === "series") {
          series.push(tagName);
        }
      });
      
      setCharacterTags(characters);
      setTypeTags(types);
      setSeriesTags(series);
    } catch (error) {
      console.error("Error fetching item tags:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // コンテンツ名を取得
  const fetchContentName = async () => {
    if (!itemId) return;
    
    try {
      const { data, error } = await supabase
        .from("official_items")
        .select("content_name")
        .eq("id", itemId)
        .single();
      
      if (error) {
        console.error("Error fetching content name:", error);
        return;
      }
      
      if (data && data.content_name) {
        setContentName(data.content_name);
      }
    } catch (error) {
      console.error("Error in fetchContentName:", error);
    }
  };

  // 利用可能なコンテンツを取得
  const fetchAvailableContents = async () => {
    try {
      const { data, error } = await supabase
        .from("content_names")
        .select("id, name")
        .order("name");
      
      if (error) {
        console.error("Error fetching available contents:", error);
        return;
      }
      
      if (data) {
        setAvailableContents(data);
      }
    } catch (error) {
      console.error("Error in fetchAvailableContents:", error);
    }
  };

  // タグ検索
  const handleSearch = async (category: string, query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const results = await searchTagsByCategory(category, query);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching tags:", error);
    }
  };

  // タグを追加
  const addTag = async (category: string, tagName: string) => {
    if (!itemId || !tagName.trim()) return;
    
    try {
      const success = await addTagToItem(itemId, tagName, category);
      
      if (success) {
        // 対応するカテゴリーのタグリストを更新
        if (category === "character") {
          setCharacterTags(prev => [...prev, tagName]);
        } else if (category === "type") {
          setTypeTags(prev => [...prev, tagName]);
        } else if (category === "series") {
          setSeriesTags(prev => [...prev, tagName]);
        }
        
        toast({
          title: "タグを追加しました",
          description: `${tagName}を追加しました。`,
        });
      } else {
        toast({
          title: "エラー",
          description: "タグの追加に失敗しました。",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding tag:", error);
      toast({
        title: "エラー",
        description: "タグの追加中にエラーが発生しました。",
        variant: "destructive",
      });
    }
  };

  // タグを削除
  const removeTag = async (category: string, tagName: string) => {
    if (!itemId || !tagName) return;
    
    try {
      const success = await removeTagFromItem(itemId, tagName);
      
      if (success) {
        // 対応するカテゴリーのタグリストを更新
        if (category === "character") {
          setCharacterTags(prev => prev.filter(tag => tag !== tagName));
        } else if (category === "type") {
          setTypeTags(prev => prev.filter(tag => tag !== tagName));
        } else if (category === "series") {
          setSeriesTags(prev => prev.filter(tag => tag !== tagName));
        }
        
        toast({
          title: "タグを削除しました",
          description: `${tagName}を削除しました。`,
        });
      } else {
        toast({
          title: "エラー",
          description: "タグの削除に失敗しました。",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing tag:", error);
      toast({
        title: "エラー",
        description: "タグの削除中にエラーが発生しました。",
        variant: "destructive",
      });
    }
  };

  // コンテンツ名を更新
  const updateContentName = async (newContentName: string) => {
    if (!itemId) return;
    
    try {
      const { error } = await supabase
        .from("official_items")
        .update({ content_name: newContentName })
        .eq("id", itemId);
      
      if (error) {
        console.error("Error updating content name:", error);
        toast({
          title: "エラー",
          description: "コンテンツ名の更新に失敗しました。",
          variant: "destructive",
        });
        return false;
      }
      
      setContentName(newContentName);
      toast({
        title: "コンテンツ名を更新しました",
        description: `コンテンツ名を${newContentName}に更新しました。`,
      });
      return true;
    } catch (error) {
      console.error("Error in updateContentName:", error);
      toast({
        title: "エラー",
        description: "コンテンツ名の更新中にエラーが発生しました。",
        variant: "destructive",
      });
      return false;
    }
  };

  // 初期読み込み
  useEffect(() => {
    if (itemId) {
      fetchItemTags();
      fetchContentName();
    }
    fetchAvailableContents();
  }, [itemId]);

  return {
    isLoading,
    characterTags,
    typeTags,
    seriesTags,
    contentName,
    availableContents,
    searchResults,
    searchQuery,
    setSearchQuery,
    handleSearch,
    addTag,
    removeTag,
    updateContentName
  };
}

export default useTagManage;
