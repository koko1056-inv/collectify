import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useContentName(isOpen: boolean, itemIds: string[], isUserItem: boolean) {
  const [contentName, setContentName] = useState<string | null>(null);

  // コンテンツ名を取得
  const { data: itemsData } = useQuery({
    queryKey: ["items-content", itemIds, isUserItem],
    queryFn: async () => {
      if (itemIds.length === 0) return [];
      
      const table = isUserItem ? "user_items" : "official_items";
      const { data, error } = await supabase
        .from(table)
        .select("id, content_name")
        .in("id", itemIds);
      
      if (error) {
        console.error("Error fetching items content:", error);
        return [];
      }
      
      return data || [];
    },
    enabled: isOpen && itemIds.length > 0,
  });

  // 複数アイテムの場合は共通のコンテンツ名を取得
  useEffect(() => {
    if (itemsData && itemsData.length > 0) {
      if (itemsData.length === 1) {
        // 単一アイテムの場合はそのままコンテンツ名を設定
        setContentName(itemsData[0].content_name);
      } else {
        // 複数アイテムの場合は、すべて同じコンテンツ名を持つ場合のみそれを表示
        const firstContentName = itemsData[0].content_name;
        const allSameContent = itemsData.every(item => item.content_name === firstContentName);
        
        if (allSameContent) {
          setContentName(firstContentName);
        } else {
          // 異なるコンテンツ名が混在する場合は空にする
          setContentName(null);
        }
      }
    }
  }, [itemsData]);

  // モーダルが閉じられたときにリセット
  useEffect(() => {
    if (!isOpen) {
      setContentName(null);
    }
  }, [isOpen]);

  return { contentName, setContentName };
}