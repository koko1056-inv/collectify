
import { useState } from "react";
import { TagDialog } from "./tag/TagDialog";  // 正しいパスからインポート
import { Button } from "./ui/button";
import { Tag } from "@/types/tag"; // Tag型をインポート

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tags?: Tag[]; // tagsプロパティを追加（オプショナル）
}

export function TagFilter({ selectedTags, onTagsChange, tags = [] }: TagFilterProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDialogOpen = () => {
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  const handleTagsSelect = (newTags: string[]) => {
    onTagsChange(newTags);
  };

  return (
    <div>
      <Button variant="outline" size="sm" onClick={handleDialogOpen}>
        タグを編集
      </Button>
      <TagDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        initialTags={selectedTags || []}
        itemIds={[]}  // 空の配列を渡す
        onTagsSelect={handleTagsSelect}
      />
    </div>
  );
}
