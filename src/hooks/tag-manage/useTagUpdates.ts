import { useState, useEffect, useCallback } from "react";
import { TagUpdate } from "@/types/tag";

export function useTagUpdates(isOpen: boolean) {
  const [pendingUpdates, setPendingUpdates] = useState<TagUpdate[]>([]);

  // モーダルが閉じられたときにリセット
  useEffect(() => {
    if (!isOpen) {
      setPendingUpdates([]);
    }
  }, [isOpen]);

  // タグ変更ハンドラ
  const handleTagChange = useCallback((category: string) => (value: string | null) => {
    console.log(`Updating tag for category: ${category} with value: ${value}`);
    setPendingUpdates((prev) => {
      const existing = prev.findIndex((u) => u.category === category);
      if (existing !== -1) {
        const updated = [...prev];
        updated[existing] = { category, value };
        return updated;
      }
      return [...prev, { category, value }];
    });
  }, []);

  return { pendingUpdates, handleTagChange };
}