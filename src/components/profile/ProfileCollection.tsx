
import React, { useState, useCallback } from "react";
import { FilterBar } from "../FilterBar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types";
import { UserCollection } from "../UserCollection";
import { SlotUsageMeter } from "@/components/shop/SlotUsageMeter";
import { X } from "lucide-react";
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
import { useLanguage } from "@/contexts/LanguageContext";

export function ProfileCollection({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState("");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const { user } = useAuth();

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

      {/* 自分のプロフィールでは枠の使用状況を常に表示する */}
      {isOwnProfile && <SlotUsageMeter type="collection" className="mx-4" />}

      {/* 検索バー */}
      <div>
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
            {t("profileScreen.collection.clearAll")}
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
            <DrawerTitle className="text-center font-medium mb-4">{t("profileScreen.collection.filter")}</DrawerTitle>
            <DrawerClose className="absolute right-4 top-4">
              <button className="text-sm text-primary font-medium">{t("profileScreen.collection.done")}</button>
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
