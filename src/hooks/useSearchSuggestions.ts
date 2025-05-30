
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

  // 検索候補を取得（改善版）
  const { data: searchSuggestions = [], isLoading, error } = useQuery({
    queryKey: ["search-suggestions", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      console.log('検索クエリ:', searchQuery);

      try {
        // グッズのタイトル検索を改善
        const { data: items, error: itemsError } = await supabase
          .from("official_items")
          .select("id, title, image, price, description, release_date, content_name")
          .or(`title.ilike.%${searchQuery}%,content_name.ilike.%${searchQuery}%`)
          .order("title")
          .limit(8);

        if (itemsError) {
          console.error("グッズ検索エラー:", itemsError);
          throw itemsError;
        }

        console.log('検索結果のグッズ:', items?.length || 0);

        // コンテンツ名検索
        const { data: contents, error: contentsError } = await supabase
          .from("content_names")
          .select("id, name")
          .ilike("name", `%${searchQuery}%`)
          .order("name")
          .limit(3);

        if (contentsError) {
          console.error("コンテンツ検索エラー:", contentsError);
        }

        console.log('検索結果のコンテンツ:', contents?.length || 0);

        // 結果を統合
        const suggestions: SearchSuggestion[] = [
          ...(items || []).map(item => ({
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

        console.log('最終的な検索候補:', suggestions.length);
        return suggestions;
      } catch (error) {
        console.error("検索エラー:", error);
        return [];
      }
    },
    enabled: searchQuery.length >= 2,
    staleTime: 1000 * 30, // 30秒間キャッシュ
  });

  useEffect(() => {
    if (!isLoading && !error) {
      setSuggestions(searchSuggestions);
      console.log('検索候補を更新:', searchSuggestions.length);
    }
  }, [searchSuggestions, isLoading, error]);

  useEffect(() => {
    if (error) {
      console.error('検索候補取得エラー:', error);
      setSuggestions([]);
    }
  }, [error]);

  return {
    suggestions,
    showSuggestions,
    setShowSuggestions,
    isLoading,
    error
  };
}
