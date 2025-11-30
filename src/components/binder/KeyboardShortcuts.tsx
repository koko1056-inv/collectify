import { useEffect } from "react";

interface KeyboardShortcutsProps {
  selectedItemId: string | null;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onMove: (dx: number, dy: number) => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

export function KeyboardShortcuts({
  selectedItemId,
  onDelete,
  onDuplicate,
  onCopy,
  onPaste,
  onMove,
  onBringToFront,
  onSendToBack,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力フィールド内では無効化
      if ((e.target as HTMLElement).tagName === "INPUT" || 
          (e.target as HTMLElement).tagName === "TEXTAREA") {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // 削除: Delete or Backspace
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
        e.preventDefault();
        onDelete();
      }

      // コピー: Ctrl/Cmd + C
      if (modifier && e.key === "c" && selectedItemId) {
        e.preventDefault();
        onCopy();
      }

      // 貼り付け: Ctrl/Cmd + V
      if (modifier && e.key === "v") {
        e.preventDefault();
        onPaste();
      }

      // 複製: Ctrl/Cmd + D
      if (modifier && e.key === "d" && selectedItemId) {
        e.preventDefault();
        onDuplicate();
      }

      // 最前面へ: Ctrl/Cmd + ]
      if (modifier && e.key === "]" && selectedItemId) {
        e.preventDefault();
        onBringToFront();
      }

      // 最背面へ: Ctrl/Cmd + [
      if (modifier && e.key === "[" && selectedItemId) {
        e.preventDefault();
        onSendToBack();
      }

      // 矢印キーで移動
      if (selectedItemId && !modifier) {
        const moveAmount = e.shiftKey ? 10 : 1;
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            onMove(0, -moveAmount);
            break;
          case "ArrowDown":
            e.preventDefault();
            onMove(0, moveAmount);
            break;
          case "ArrowLeft":
            e.preventDefault();
            onMove(-moveAmount, 0);
            break;
          case "ArrowRight":
            e.preventDefault();
            onMove(moveAmount, 0);
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemId, onDelete, onDuplicate, onCopy, onPaste, onMove, onBringToFront, onSendToBack]);

  return null;
}
