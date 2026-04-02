import { useState, useCallback, useMemo } from "react";
import { Tag } from "@/types";
import { TagFilter } from "./TagFilter";
import { SearchBar } from "./SearchBar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronDown, Tag as TagIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "./ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "./ui/badge";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  selectedContent: string;
  onContentChange: (content: string) => void;
  tags: Tag[];
  selectedPersonalTag?: string;
  onPersonalTagChange?: (tag: string) => void;
  contentNames?: { id: string; name: string }[];
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedTags,
  onTagsChange,
  selectedContent,
  onContentChange,
  tags,
  selectedPersonalTag,
  onPersonalTagChange,
}: FilterBarProps) {
  const { user } = useAuth();
  const [contentSearchQuery, setContentSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPersonalTagDialogOpen, setIsPersonalTagDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  // ユーザーの全マイタグを取得
  const { data: personalTags = [] } = useQuery({
    queryKey: ["all-personal-tag-names", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_personal_tags")
        .select("tag_name")
        .eq("user_id", user.id);

      if (error) throw error;
      
      const uniqueTags = [...new Set(data.map(t => t.tag_name))];
      return uniqueTags.sort();
    },
    enabled: !!user,
  });

  const handleContentSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setContentSearchQuery(e.target.value);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open);
  }, []);

  const handleContentSelect = useCallback((content: string) => {
    onContentChange(content);
    setIsDialogOpen(false);
  }, [onContentChange]);

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

  const filteredContentNames = useMemo(() => 
    contentNames.filter(content =>
      content.name && content.name.toLowerCase().includes(contentSearchQuery.toLowerCase())
    ), [contentNames, contentSearchQuery]
  );

  const popularContentNames = useMemo(() => contentNames.slice(0, 5), [contentNames]);

  const displayText = useMemo(() => {
    if (!selectedContent || selectedContent === "all") return "コンテンツで絞り込む";
    return selectedContent;
  }, [selectedContent]);

  return (
    <div className="space-y-3 w-full">
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        selectedTags={selectedTags}
        onTagsChange={onTagsChange}
        tags={tags}
        selectedContent={selectedContent}
      />

      <div className="w-full space-y-2">
        <Button
          variant="outline"
          onClick={handleDialogOpenChange.bind(null, true)}
          className="w-full justify-between font-normal text-xs h-8"
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="h-3 w-3 opacity-50 ml-2 flex-shrink-0" />
        </Button>

        <div className="flex flex-wrap gap-1.5">
          <Button
            key="all"
            variant={!selectedContent || selectedContent === "all" ? "default" : "outline"}
            size="sm"
            className="text-xs h-7 px-3"
            onClick={() => onContentChange("all")}
          >
            すべて
          </Button>
          {contentNames.map((content) => (
            <Button
              key={content.id}
              variant={selectedContent === content.name ? "default" : "outline"}
              size="sm"
              className="text-xs h-7 px-3"
              onClick={handleContentSelect.bind(null, content.name)}
            >
              {content.name}
            </Button>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
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
                onChange={handleContentSearchChange}
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
                    onClick={handleContentSelect.bind(null, "all")}
                  >
                    <span className="text-base">すべて</span>
                  </Button>
                )}
                {filteredContentNames.map((content) => (
                  <Button
                    key={content.id}
                    variant={selectedContent === content.name ? "default" : "outline"}
                    className="h-auto min-h-[5rem] px-2 py-4 flex flex-col items-center justify-center gap-2"
                    onClick={handleContentSelect.bind(null, content.name)}
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

      {/* マイタグフィルタ */}
      {user && personalTags.length > 0 && onPersonalTagChange && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TagIcon className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">マイタグで絞り込み</span>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max gap-1.5 pb-2">
              <Button
                variant={!selectedPersonalTag ? "default" : "outline"}
                size="sm"
                className="text-xs h-6 px-2 shrink-0"
                onClick={() => onPersonalTagChange("")}
              >
                すべて
              </Button>
              {personalTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedPersonalTag === tag ? "default" : "secondary"}
                  className={`text-xs cursor-pointer ${
                    selectedPersonalTag === tag 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                  onClick={() => onPersonalTagChange(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      <TagFilter
        selectedTags={selectedTags}
        onTagsChange={onTagsChange}
        tags={tags}
        selectedContent={selectedContent}
      />
    </div>
  );
}
