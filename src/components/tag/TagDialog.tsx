
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TagInputField } from "./TagInputField";
import { getTagsByCategory } from "@/utils/tag/tag-search";
import { TagCategory } from "@/types/tag";

// 循環参照を避けるために、必要な型だけをインポート
import type { Tag } from "@/types/tag";

interface TagDialogProps {
  open: boolean;
  onClose: () => void;
  initialValue: string | null;
  onSelect: (value: string | null) => void;
  category: TagCategory;
}

export function TagDialog({
  open,
  onClose,
  initialValue,
  onSelect,
  category
}: TagDialogProps) {
  const [inputValue, setInputValue] = useState(initialValue || "");
  const [selectedTag, setSelectedTag] = useState<string | null>(initialValue);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  // カテゴリー別のタグを取得
  useEffect(() => {
    async function fetchTags() {
      if (open) {
        const tags = await getTagsByCategory(category);
        setAvailableTags(tags);
      }
    }
    fetchTags();
  }, [category, open]);

  // ダイアログが閉じられたときにリセット
  useEffect(() => {
    if (!open) {
      setInputValue(initialValue || "");
      setSelectedTag(initialValue);
    }
  }, [open, initialValue]);

  // 選択したタグを確定して閉じる
  const handleConfirm = () => {
    onSelect(selectedTag);
    onClose();
  };

  // タグが選択されたときの処理
  const handleTagSelect = (tag: string | null) => {
    setSelectedTag(tag);
    if (tag) {
      setInputValue(tag);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getCategoryTitle(category)}を選択</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <TagInputField
            category={category}
            selectedTags={selectedTag ? [selectedTag] : []}
            onTagsChange={(tags) => {
              if (tags.length > 0) {
                handleTagSelect(tags[0]);
              } else {
                handleTagSelect(null);
              }
            }}
            itemIds={[]}
            onClose={() => {}}
            isUserItem={false}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleConfirm}>
            選択
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// カテゴリーに応じたタイトルを返す関数
function getCategoryTitle(category: TagCategory): string {
  switch (category) {
    case 'character':
      return 'キャラクター';
    case 'type':
      return 'グッズタイプ';
    case 'series':
      return 'シリーズ';
    default:
      return 'タグ';
  }
}
