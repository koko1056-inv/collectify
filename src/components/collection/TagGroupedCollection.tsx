
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { getItemsGroupedByTag, getItemsGroupedByCustomGroups } from "@/utils/tag/tag-groups";
import { CollectionGrid } from "./CollectionGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { DragEndEvent } from "@dnd-kit/core";
import { Tag, FolderPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryTagSearch } from "@/components/tag/CategoryTagSearch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface TagGroupedCollectionProps {
  userId: string;
}

export function TagGroupedCollection({ userId }: TagGroupedCollectionProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupViewMode, setGroupViewMode] = useState<"tags" | "groups">("tags");
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  
  // タグでグループ化したアイテムを取得
  const { data: itemsByTag = {}, isLoading: isTagLoading } = useQuery({
    queryKey: ["items-by-tag", userId],
    queryFn: async () => {
      return getItemsGroupedByTag(userId);
    },
    enabled: !!userId && groupViewMode === "tags",
  });
  
  // カスタムグループでグループ化したアイテムを取得
  const { data: itemsByGroup = {}, isLoading: isGroupLoading } = useQuery({
    queryKey: ["items-by-group", userId],
    queryFn: async () => {
      return getItemsGroupedByCustomGroups(userId);
    },
    enabled: !!userId && groupViewMode === "groups",
  });
  
  // 現在のビューモードに基づいてアイテムを選択
  const currentItems = groupViewMode === "tags" ? itemsByTag : itemsByGroup;
  const isLoading = groupViewMode === "tags" ? isTagLoading : isGroupLoading;
  
  // フィルタリング機能
  const filteredTagNames = Object.keys(currentItems).filter(tagName => 
    searchQuery ? tagName.toLowerCase().includes(searchQuery.toLowerCase()) : true
  ).sort();
  
  // 初回レンダリング時にアクティブなタグを設定
  useEffect(() => {
    if (filteredTagNames.length > 0 && !activeTag) {
      setActiveTag(filteredTagNames[0]);
    } else if (filteredTagNames.length > 0 && !filteredTagNames.includes(activeTag || "")) {
      setActiveTag(filteredTagNames[0]);
    }
  }, [filteredTagNames, activeTag]);
  
  // タブ切り替え時にアクティブなタグをリセット
  useEffect(() => {
    setActiveTag(null);
    setSearchQuery("");
  }, [groupViewMode]);

  const handleDragEnd = (event: DragEndEvent) => {
    // ドラッグ&ドロップの実装はここに入れることができます
    // 現在は何もしません
  };
  
  // 新しいグループを作成する処理（実際のグループ作成APIを呼び出す）
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    try {
      // ここでグループを作成するAPIを呼び出す
      console.log("Creating group:", newGroupName);
      
      // APIの実装例（実際にはSuperbaseなどのAPIを呼び出す）
      
      // ダイアログを閉じてフォームをリセット
      setIsCreateGroupDialogOpen(false);
      setNewGroupName("");
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-[120px] w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (Object.keys(currentItems).length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">コレクションに追加されたアイテムがありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={groupViewMode} onValueChange={(value) => setGroupViewMode(value as "tags" | "groups")}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-white">
            <TabsTrigger value="tags" className="data-[state=active]:bg-gray-100">
              <Tag className="h-4 w-4 mr-2" />
              タグ別
            </TabsTrigger>
            <TabsTrigger value="groups" className="data-[state=active]:bg-gray-100">
              <FolderPlus className="h-4 w-4 mr-2" />
              グループ別
            </TabsTrigger>
          </TabsList>
          
          {groupViewMode === "groups" && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsCreateGroupDialogOpen(true)}
              className="text-xs"
            >
              <FolderPlus className="h-3.5 w-3.5 mr-1" />
              グループ作成
            </Button>
          )}
        </div>
        
        <div className="mt-4">
          <CategoryTagSearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>
        
        <ScrollArea className="w-full mt-4">
          <div className="flex space-x-2 pb-2">
            {filteredTagNames.map((tagName) => (
              <Button
                key={tagName}
                variant={activeTag === tagName ? "default" : "outline"}
                size="sm"
                className="whitespace-nowrap"
                onClick={() => setActiveTag(tagName)}
              >
                {tagName} ({currentItems[tagName].length})
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="mt-6">
          {activeTag && currentItems[activeTag] && (
            <>
              <h3 className="text-lg font-semibold mb-3">
                {activeTag} <span className="text-sm text-gray-500">({currentItems[activeTag].length}アイテム)</span>
              </h3>
              <CollectionGrid
                items={currentItems[activeTag]}
                isCompact={isCompact}
                isSelectionMode={false}
                selectedItems={[]}
                onSelectItem={() => {}}
                onDragEnd={handleDragEnd}
              />
            </>
          )}
        </div>
      </Tabs>
      
      {/* グループ作成ダイアログ */}
      <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>新しいグループを作成</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="group-name" className="text-sm font-medium">
                グループ名
              </label>
              <Input
                id="group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="グループ名を入力"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateGroupDialogOpen(false)}>
              キャンセル
            </Button>
            <Button type="button" onClick={handleCreateGroup}>
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
