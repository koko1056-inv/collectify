import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "search_history";
const MAX_HISTORY = 10;

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // 初期読み込み
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SearchHistoryItem[];
        setHistory(parsed);
      }
    } catch (error) {
      console.error("Failed to load search history:", error);
    }
  }, []);

  // 履歴を保存
  const saveToStorage = useCallback((items: SearchHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  }, []);

  // 検索クエリを追加
  const addToHistory = useCallback((query: string) => {
    if (!query.trim() || query.length < 2) return;

    setHistory((prev) => {
      // 既存の同じクエリを削除
      const filtered = prev.filter(
        (item) => item.query.toLowerCase() !== query.toLowerCase()
      );
      
      // 新しいクエリを先頭に追加
      const newHistory = [
        { query: query.trim(), timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_HISTORY);

      saveToStorage(newHistory);
      return newHistory;
    });
  }, [saveToStorage]);

  // 履歴から1件削除
  const removeFromHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const filtered = prev.filter(
        (item) => item.query.toLowerCase() !== query.toLowerCase()
      );
      saveToStorage(filtered);
      return filtered;
    });
  }, [saveToStorage]);

  // 履歴をすべてクリア
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
