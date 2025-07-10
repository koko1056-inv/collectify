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
  const handleTagChange = useCallback((category: string) => {
    console.log(`[useTagUpdates] Creating handler for category: ${category}`);
    
    return (value: string | null) => {
      console.log(`[useTagUpdates] =====HANDLER CALLED=====`);
      console.log(`[useTagUpdates] Category: ${category}`);
      console.log(`[useTagUpdates] Value: ${value}`);
      console.log(`[useTagUpdates] Value type:`, typeof value);
      
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
        
        console.log(`[useTagUpdates] Final new updates:`, newUpdates);
        return newUpdates;
      });
      
      console.log(`[useTagUpdates] =====HANDLER COMPLETE=====`);
    };
  }, []); // 依存配列を空にして無限ループを防ぐ

  return { pendingUpdates, handleTagChange };
}