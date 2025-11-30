import { useEffect, useRef } from "react";
import { useDebounce } from "./useDebounce";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({
  data,
  onSave,
  delay = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>) {
  const debouncedData = useDebounce(data, delay);
  const isFirstRender = useRef(true);
  const isSaving = useRef(false);

  useEffect(() => {
    // 初回レンダー時はスキップ
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // 保存が無効な場合はスキップ
    if (!enabled) return;

    // 既に保存中の場合はスキップ
    if (isSaving.current) return;

    const save = async () => {
      try {
        isSaving.current = true;
        await onSave(debouncedData);
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        isSaving.current = false;
      }
    };

    save();
  }, [debouncedData, enabled, onSave]);
}
