import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tag } from "@/types";
import { ChevronRight } from "lucide-react";
interface SlideFilterBarProps {
  selectedContent: string;
  onContentChange: (content: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tags: Tag[];
}
export function SlideFilterBar({
  selectedContent,
  onContentChange,
  selectedTags,
  onTagsChange,
  tags
}: SlideFilterBarProps) {
  // グッズタイプのタグだけをフィルタリング
  const typeTags = tags.filter(tag => tag.category === 'type');

  // コンテンツ選択用のボタンスタイル
  const getContentButtonStyle = (isSelected: boolean) => {
    return isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-white text-gray-700 hover:bg-gray-100";
  };

  // タグ選択用のボタンスタイル
  const getTagButtonStyle = (isSelected: boolean) => {
    return isSelected ? "bg-primary/10 text-primary border-primary/30" : "bg-white text-gray-700 border-gray-200";
  };
  return <div className="space-y-4">
      <ScrollArea className="w-full whitespace-nowrap">
        
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>;
}