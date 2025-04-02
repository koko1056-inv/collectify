
import React, { useState } from "react";
import { Tag } from "@/types";
import { TagFilter } from "./TagFilter";
import { Input } from "./ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronDown, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  selectedContent: string;
  onContentChange: (content: string) => void;
  tags: Tag[];
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedTags,
  onTagsChange,
  selectedContent,
  onContentChange,
  tags,
}: FilterBarProps) {
  const [contentSearchQuery, setContentSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  const { data: contentNames = [] } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_names")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredContentNames = contentNames.filter(content =>
    content.name.toLowerCase().includes(contentSearchQuery.toLowerCase())
  );

  const popularContentNames = contentNames.slice(0, 5);

  const getDisplayText = () => {
    if (!selectedContent || selectedContent === "all") return "コンテンツで絞り込む";
    return selectedContent;
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleSearchIconClick = () => {
    // 検索アイコンをクリックしたときに検索を実行する
    if (isMobile) {
      onSearchChange(searchQuery);
    }
  };

  // Enterキーを押したときにも検索を実行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchChange(searchQuery);
    }
  };

  return (
    <div className="space-y-3 w-full">
      {/* 検索バーコンポーネント */}
      <div className="max-w-xl mx-auto mb-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="グッズを検索..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            className="pl-10 bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200"
          />
          <div 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
            onClick={handleSearchIconClick}
            aria-label="検索実行"
          >
            <Search className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="w-full">
        <Button
          variant="outline"
          onClick={() => setIsDialogOpen(true)}
          className="w-full justify-between font-normal text-xs h-8"
        >
          <span>{getDisplayText()}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>

        <ScrollArea className="w-full whitespace-nowrap mt-2">
          <div className="flex gap-1.5 pb-2">
            <Button
              key="all"
              variant={!selectedContent || selectedContent === "all" ? "default" : "outline"}
              size="sm"
              className="text-xs h-6 px-2 shrink-0"
              onClick={() => onContentChange("all")}
            >
              すべて
            </Button>
            {popularContentNames.map((content) => (
              <Button
                key={content.id}
                variant={selectedContent === content.name ? "default" : "outline"}
                size="sm"
                className="text-xs h-6 px-2 shrink-0"
                onClick={() => onContentChange(content.name)}
              >
                {content.name}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                コンテンツを選択
              </DialogTitle>
            </DialogHeader>
            <div className="p-4 pb-0">
              <Input
                placeholder="コンテンツを検索..."
                value={contentSearchQuery}
                onChange={(e) => setContentSearchQuery(e.target.value)}
                className="mb-4"
              />
            </div>
            <ScrollArea className="h-[50vh] pr-4">
              <div className="grid grid-cols-2 gap-2 p-4">
                {contentSearchQuery === "" && (
                  <Button
                    key="all"
                    variant={!selectedContent || selectedContent === "all" ? "default" : "outline"}
                    className="h-auto min-h-[5rem] px-2 py-4 flex flex-col items-center justify-center gap-2"
                    onClick={() => {
                      onContentChange("all");
                      setIsDialogOpen(false);
                    }}
                  >
                    <span className="text-base">すべて</span>
                  </Button>
                )}
                {filteredContentNames.map((content) => (
                  <Button
                    key={content.id}
                    variant={selectedContent === content.name ? "default" : "outline"}
                    className="h-auto min-h-[5rem] px-2 py-4 flex flex-col items-center justify-center gap-2"
                    onClick={() => {
                      onContentChange(content.name);
                      setIsDialogOpen(false);
                    }}
                  >
                    <span className="text-xs break-words text-center w-full line-clamp-2">
                      {content.name}
                    </span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <TagFilter
        selectedTags={selectedTags}
        onTagsChange={onTagsChange}
        tags={tags}
      />
    </div>
  );
}
