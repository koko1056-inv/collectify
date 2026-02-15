
import React, { useState, useCallback } from "react";
import { FilterBar } from "../FilterBar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types";
import { UserCollection } from "../UserCollection";
import { useCollectionLimitStatus } from "@/hooks/useCollectionLimit";
import { Progress } from "@/components/ui/progress";
import { Package, SlidersHorizontal, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SearchBar } from "../SearchBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ProfileCollection({ userId }: { userId: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState("");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const { user } = useAuth();
  const limitStatus = useCollectionLimitStatus();

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const isOwnProfile = user?.id === userId;

  const activeFilterCount = (selectedContent && selectedContent !== "all" ? 1 : 0) + selectedTags.length;

  const clearAllFilters = useCallback(() => {
    setSelectedContent("all");
    setSelectedTags([]);
  }, []);

  return (
    <div className="space-y-3 my-0 mx-0 px-0 py-px">
      {isOwnProfile && limitStatus && (
        <div className="mx-4 p-3 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              コレクション枠
            </span>
            <span className="ml-auto text-sm text-muted-foreground">
              {limitStatus.currentCount} / {limitStatus.maxSlots}
            </span>
          </div>
          <Progress 
            value={limitStatus.usagePercent} 
            className="h-2"
          />
          {limitStatus.isAtLimit && (
            <p className="text-xs text-destructive mt-1">
              上限に達しています。ポイントショップで枠を追加できます。
            </p>
          )}
        </div>
      )}

      {/* 検索バー + フィルターボタン */}
      <div className="flex items-center gap-2 px-2">
        <div className="flex-1 min-w-0">
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            tags={allTags}
            selectedContent={selectedContent}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsFilterDrawerOpen(true)}
          className="shrink-0 h-9 w-9 relative"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* アクティブフィルターチップ */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap px-3">
          {selectedContent && selectedContent !== "all" && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1">
              {selectedContent}
              <button onClick={() => setSelectedContent("all")} className="ml-0.5 hover:bg-muted rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedTags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs gap-1 pr-1">
              #{tag}
              <button onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))} className="ml-0.5 hover:bg-muted rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            すべてクリア
          </button>
        </div>
      )}

      <UserCollection
        selectedTags={selectedTags}
        userId={userId}
      />

      {/* フィルターDrawer */}
      <Drawer open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
        <DrawerContent className="max-h-[85vh] px-4 pt-4 pb-8">
          <div className="mx-auto w-full max-w-sm">
            <DrawerTitle className="text-center font-medium mb-4">フィルター</DrawerTitle>
            <DrawerClose className="absolute right-4 top-4">
              <button className="text-sm text-primary font-medium">完了</button>
            </DrawerClose>
            <ScrollArea className="h-[65vh] pr-4">
              <FilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                selectedContent={selectedContent}
                onContentChange={setSelectedContent}
                tags={allTags}
              />
            </ScrollArea>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
