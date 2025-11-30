import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

interface SimilarItem {
  id: string;
  title: string;
  image: string;
}

export function useSimilarItemsCheck(title: string) {
  const [similarItems, setSimilarItems] = useState<SimilarItem[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const debouncedTitle = useDebounce(title, 500);

  useEffect(() => {
    const checkSimilarItems = async () => {
      if (!debouncedTitle || debouncedTitle.length < 2) {
        setSimilarItems([]);
        return;
      }

      setIsChecking(true);
      try {
        // タイトルの正規化（全角/半角、大文字/小文字を統一）
        const normalizedTitle = debouncedTitle
          .toLowerCase()
          .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => 
            String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
          );

        // 類似度チェック用のキーワード抽出
        const keywords = normalizedTitle.split(/[\s　]+/).filter(k => k.length > 0);

        // 完全一致をチェック
        const { data: exactMatches } = await supabase
          .from('official_items')
          .select('id, title, image')
          .ilike('title', debouncedTitle)
          .limit(5);

        // 部分一致をチェック（各キーワードに対して）
        const partialMatchPromises = keywords.map(keyword =>
          supabase
            .from('official_items')
            .select('id, title, image')
            .ilike('title', `%${keyword}%`)
            .limit(5)
        );

        const partialResults = await Promise.all(partialMatchPromises);
        const partialMatches = partialResults
          .flatMap(result => result.data || [])
          .filter((item, index, self) => 
            // 重複を除去
            index === self.findIndex(t => t.id === item.id)
          );

        // 完全一致と部分一致を結合して重複を除去
        const allMatches = [...(exactMatches || []), ...partialMatches]
          .filter((item, index, self) => 
            index === self.findIndex(t => t.id === item.id)
          );

        // 類似度でソート（より多くのキーワードにマッチするものを優先）
        const sortedMatches = allMatches
          .map(item => {
            const itemTitle = item.title.toLowerCase();
            const matchCount = keywords.filter(k => 
              itemTitle.includes(k.toLowerCase())
            ).length;
            return { ...item, matchCount };
          })
          .sort((a, b) => b.matchCount - a.matchCount)
          .slice(0, 5);

        setSimilarItems(sortedMatches);
      } catch (error) {
        console.error('Error checking similar items:', error);
        setSimilarItems([]);
      } finally {
        setIsChecking(false);
      }
    };

    checkSimilarItems();
  }, [debouncedTitle]);

  return { similarItems, isChecking };
}
