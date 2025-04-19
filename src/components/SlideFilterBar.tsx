
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
    return isSelected
      ? "bg-purple-600 text-white hover:bg-purple-700"
      : "bg-white text-gray-700 hover:bg-gray-100";
  };

  // タグ選択用のボタンスタイル
  const getTagButtonStyle = (isSelected: boolean) => {
    return isSelected
      ? "bg-purple-100 text-purple-700 border-purple-300"
      : "bg-white text-gray-700 border-gray-200";
  };

  return (
    <div className="w-full space-y-4 bg-gray-50 p-4 rounded-lg shadow-sm mb-6">
      {/* コンテンツ選択セクション */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <ChevronRight className="h-4 w-4" />
          <span>コンテンツ</span>
        </div>
        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={`${getContentButtonStyle(selectedContent === "all")} rounded-full text-sm px-4`}
              onClick={() => onContentChange("all")}
            >
              すべて
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`${getContentButtonStyle(selectedContent === "アニメ")} rounded-full text-sm px-4`}
              onClick={() => onContentChange("アニメ")}
            >
              アニメ
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`${getContentButtonStyle(selectedContent === "ゲーム")} rounded-full text-sm px-4`}
              onClick={() => onContentChange("ゲーム")}
            >
              ゲーム
            </Button>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* グッズタイプ選択セクション */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <ChevronRight className="h-4 w-4" />
          <span>グッズタイプ</span>
        </div>
        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <div className="flex gap-2">
            {typeTags.map((tag) => (
              <Button
                key={tag.id}
                variant="outline"
                size="sm"
                className={`${getTagButtonStyle(selectedTags.includes(tag.name))} rounded-full text-sm px-4`}
                onClick={() => {
                  if (selectedTags.includes(tag.name)) {
                    onTagsChange(selectedTags.filter(t => t !== tag.name));
                  } else {
                    onTagsChange([...selectedTags, tag.name]);
                  }
                }}
              >
                {tag.name}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
