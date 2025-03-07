
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddTagDialog } from "./AddTagDialog";
import { TagSelectContent } from "./TagSelectContent";
import { useTagSelect } from "@/hooks/useTagSelect";

interface CategoryTagSelectProps {
  category: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}

export function CategoryTagSelect({
  category,
  label,
  value,
  onChange,
}: CategoryTagSelectProps) {
  const {
    selectedTag,
    searchQuery,
    setSearchQuery,
    filteredTags,
    isDialogOpen,
    setIsDialogOpen,
    refetch,
    getPlaceholderText,
    handleAddNewTag
  } = useTagSelect(category, value);

  const handleValueChange = (tagId: string) => {
    const selectedTag = filteredTags.find(tag => tag.id === tagId);
    if (selectedTag) {
      console.log(`CategoryTagSelect: Changed to "${selectedTag.name}" for category "${category}"`);
      onChange(selectedTag.name);
    } else {
      console.warn(`Tag with ID ${tagId} not found in tags list for category ${category}`);
    }
  };

  const handleNewTagAdded = (tagName: string) => {
    onChange(tagName);
    handleAddNewTag(tagName);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select 
          value={selectedTag?.id}
          onValueChange={handleValueChange}
          onOpenChange={(open) => {
            if (open) {
              // セレクトが開かれたときに最新データを取得
              refetch();
              // 検索クエリをリセット
              setSearchQuery("");
            }
          }}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder={getPlaceholderText()} />
          </SelectTrigger>
          <SelectContent className="bg-white w-full max-h-60 overflow-hidden" side="bottom">
            <TagSelectContent 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filteredTags={filteredTags}
            />
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <AddTagDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        category={category}
        onTagAdded={handleNewTagAdded}
      />
    </div>
  );
}
