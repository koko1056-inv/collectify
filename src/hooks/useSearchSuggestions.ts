
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SearchSuggestion {
  id: string;
  title: string;
  type: 'item' | 'content';
  image?: string;
  price?: string;
  description?: string;
  release_date?: string;
  content_name?: string;
}

export function useSearchSuggestions(searchQuery: string) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

  // 検索候補を取得（改善版 - グッズ名を優先）
  const { data: searchSuggestions = [] } = useQuery({
    queryKey: ["search-suggestions", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      // 商品タイトルから候補を取得（完全一致 → 前方一致 → 部分一致の順）
      const [exactMatch, prefixMatch, partialMatch] = await Promise.all([
        // 完全一致
        supabase
          .from("official_items")
          .select("id, title, image, price, description, release_date, content_name")
          .eq("title", searchQuery)
          .limit(3),
        // 前方一致
        supabase
          .from("official_items")
          .select("id, title, image, price, description, release_date, content_name")
          .ilike("title", `${searchQuery}%`)
          .neq("title", searchQuery)
          .limit(3),
        // 部分一致
        supabase
          .from("official_items")
          .select("id, title, image, price, description, release_date, content_name")
          .ilike("title", `%${searchQuery}%`)
          .not("title", "ilike", `${searchQuery}%`)
          .limit(4)
      ]);

      // コンテンツ名から候補を取得
      const { data: contents, error: contentsError } = await supabase
        .from("content_names")
        .select("id, name")
        .ilike("name", `%${searchQuery}%`)
        .limit(2);

      if (exactMatch.error || prefixMatch.error || partialMatch.error || contentsError) {
        console.error("Error fetching suggestions:", exactMatch.error || prefixMatch.error || partialMatch.error || contentsError);
        return [];
      }

      // 優先順位順に結合（重複除去）
      const allItems = [
        ...(exactMatch.data || []),
        ...(prefixMatch.data || []),
        ...(partialMatch.data || [])
      ];

      const uniqueItems = allItems.filter((item, index, self) => 
        index === self.findIndex(i => i.id === item.id)
      );

      const suggestions: SearchSuggestion[] = [
        ...uniqueItems.map(item => ({
          id: item.id,
          title: item.title,
          type: 'item' as const,
          image: item.image,
          price: item.price,
          description: item.description,
          release_date: item.release_date,
          content_name: item.content_name
        })),
        ...(contents || []).map(content => ({
          id: content.id,
          title: content.name,
          type: 'content' as const
        }))
      ];

      return suggestions;
    },
    enabled: searchQuery.length >= 2,
  });

  useEffect(() => {
    setSuggestions(searchSuggestions);
  }, [searchSuggestions]);

  return {
    suggestions,
    showSuggestions,
    setShowSuggestions
  };
}
