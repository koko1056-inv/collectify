import { useState, useEffect, useCallback } from "react";
import { TagUpdate } from "@/types/tag";

export function useTagUpdates(isOpen: boolean) {
  const [pendingUpdates, setPendingUpdates] = useState<TagUpdate[]>([]);

  // デバッグ用：pendingUpdatesの変化をログ出力
  useEffect(() => {
    console.log(`[useTagUpdates] Pending updates changed:`, pendingUpdates);
  }, [pendingUpdates]);

  // モーダルが閉じられたときにリセット
  useEffect(() => {
    if (!isOpen) {
      console.log(`[useTagUpdates] Modal closed, resetting pending updates`);
      setPendingUpdates([]);
    } else {
      console.log(`[useTagUpdates] Modal opened`);
    }
  }, [isOpen]);

  // タグ変更ハンドラ
  const handleTagChange = useCallback((category: string) => (value: string | null) => {
    console.log(`[useTagUpdates] Updating tag for category: ${category} with value: ${value}`);
    
    setPendingUpdates((prev) => {
      console.log(`[useTagUpdates] Previous pending updates:`, prev);
      const existing = prev.findIndex((u) => u.category === category);
      let newUpdates;
      
      if (existing !== -1) {
        newUpdates = [...prev];
        newUpdates[existing] = { category, value };
        console.log(`[useTagUpdates] Updated existing category ${category}:`, newUpdates);
      } else {
        newUpdates = [...prev, { category, value }];
        console.log(`[useTagUpdates] Added new category ${category}:`, newUpdates);
      }
      
      return newUpdates;
    });
  }, []); // 依存配列を空にして無限ループを防ぐ

  return { pendingUpdates, handleTagChange };
}