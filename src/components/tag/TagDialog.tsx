import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tag } from "@/types";

interface TagDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filteredTags: Tag[];
  selectedTags: string[];
  onTagSelect: (tagName: string) => void;
  onClearTags: () => void;
}

export function TagDialog({
  isOpen,
  onOpenChange,
  searchQuery,
  onSearchChange,
  filteredTags,
  selectedTags,
  onTagSelect,
  onClearTags,
}: TagDialogProps) {
  const getTextSize = (text: string) => {
    if (text.length > 15) return 'text-xs';
    if (text.length > 10) return 'text-sm';
    return 'text-base';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            タグを選択
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 pb-0">
          <Input
            placeholder="タグを検索..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="mb-4"
          />
        </div>
        <ScrollArea className="h-[50vh] pr-4">
          <div className="grid grid-cols-2 gap-2 p-4">
            {searchQuery === "" && (
              <Button
                key="all"
                variant={selectedTags.length === 0 ? "default" : "outline"}
                className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                onClick={() => {
                  onClearTags();
                  onOpenChange(false);
                }}
              >
                <span className="text-base">すべて</span>
              </Button>
            )}
            {filteredTags.map((tag) => (
              <Button
                key={tag.id}
                variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                className="h-auto py-6 flex flex-col items-center justify-center gap-2 px-2"
                onClick={() => onTagSelect(tag.name)}
              >
                <span className={`${getTextSize(tag.name)} break-words text-center w-full`}>
                  {tag.name}
                </span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}