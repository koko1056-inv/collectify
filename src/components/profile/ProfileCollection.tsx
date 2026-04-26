
import React, { useState, useCallback } from "react";
import { FilterBar } from "../FilterBar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types";
import { UserCollection } from "../UserCollection";
import { useCollectionLimitStatus } from "@/hooks/useCollectionLimit";
import { Progress } from "@/components/ui/progress";
import { Package, X } from "lucide-react";
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

import { FavoriteItemsTop5 } from "./FavoriteItemsTop5";

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
      {/* お気に入り TOP5 */}
      <FavoriteItemsTop5 userId={userId} isOwnProfile={isOwnProfile} />

      {/* 95%未満は非表示、以上のみ薄いpillで警告 */}
      {isOwnProfile && limitStatus && limitStatus.usagePercent >= 95 && (
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

      {/* 検索バー */}
      <div className="px-2">
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          tags={allTags}
          selectedContent={selectedContent}
        />
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
        selectedContent={selectedContent}
        onContentChange={setSelectedContent}
        onOpenFilter={() => setIsFilterDrawerOpen(true)}
        activeFilterCount={activeFilterCount}
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
