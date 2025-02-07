
import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tag } from "@/types";

interface PopularTagsProps {
  tags: Tag[];
  selectedTags: string[];
  onTagSelect: (tagName: string) => void;
  onClearTags: () => void;
}

export function PopularTags({ tags, selectedTags, onTagSelect, onClearTags }: PopularTagsProps) {
  return (
    <div className="relative w-full">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-1.5 pb-2">
          <Button
            key="all"
            variant={selectedTags.length === 0 ? "default" : "outline"}
            size="sm"
            className="text-xs h-6 px-2 shrink-0"
            onClick={onClearTags}
          >
            すべて
          </Button>
          {tags.map((tag) => (
            <Button
              key={tag.id}
              variant={selectedTags.includes(tag.name) ? "default" : "outline"}
              size="sm"
              className="text-xs h-6 px-2 shrink-0"
              onClick={() => onTagSelect(tag.name)}
            >
              {tag.name}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-2" />
      </ScrollArea>
    </div>
  );
}
