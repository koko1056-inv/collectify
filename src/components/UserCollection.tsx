
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "./ui/skeleton";
import { useState } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { CollectionGrid } from "./collection/CollectionGrid";
import { Button } from "./ui/button";
import { Dices } from "lucide-react";
import { RandomCollectionItemModal } from "./collection/RandomCollectionItemModal";
import { ThemeSelector } from "./collection/ThemeSelector";
import { ThemeAssignDialog } from "./collection/ThemeAssignDialog";
import { CollectionActions } from "./collection/CollectionActions";
import { UserItem } from "@/types";
import { useThemeManagement } from "@/hooks/collection/useThemeManagement";
import { useItemSelection } from "@/hooks/collection/useItemSelection";
import { useItemFiltering } from "@/hooks/collection/useItemFiltering";

interface UserCollectionProps {
  selectedTags: string[];
  userId?: string | null;
}

export function UserCollection({ selectedTags, userId }: UserCollectionProps) {
  const { user } = useAuth();
  const [isCompact, setIsCompact] = useState(false);
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);
  const [themeDialogData, setThemeDialogData] = useState<{
    isOpen: boolean;
    itemId: string;
    itemTitle: string;
    currentTheme: string | null;
  }>({
    isOpen: false,
    itemId: "",
    itemTitle: "",
    currentTheme: null,
  });
  
  const effectiveUserId = userId || user?.id;
  const isOwner = !userId && !!user;

  // ユーザープロフィールの取得
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", effectiveUserId)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!effectiveUserId,
  });

  // テーマ管理フック
  const {
    themes,
    activeTheme,
    setActiveTheme,
    updateItemTheme,
    handleAddTheme,
    handleRemoveTheme,
    handleRenameTheme
  } = useThemeManagement(userProfile, user?.id, selectedTags);

  // アイテム選択フック
  const {
    selectedItems,
    isSelectionMode,
    setIsSelectionMode,
    handleSelectItem,
    handleBulkThemeAssign,
    handleBulkAssignTheme
  } = useItemSelection(user?.id, selectedTags);

  // アイテムデータの取得
  const { data: items = [], isLoading: isItemsLoading } = useQuery({
    queryKey: ["user-items", effectiveUserId, selectedTags],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const query = supabase
        .from("user_items")
        .select(`
          *,
          user_item_tags (
            tags (
              id,
              name
            )
          )
        `)
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as UserItem[];
    },
    enabled: !!effectiveUserId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // フィルタリングフック
  const { filteredItems } = useItemFiltering(items, selectedTags, activeTheme);

  // ドラッグ＆ドロップの処理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    if (active.id !== over.id) {
      const draggedItem = items.find(item => item.id === active.id);
      if (!draggedItem) return;
      
      // ドラッグ終了時にテーマダイアログを表示
      setThemeDialogData({
        isOpen: true,
        itemId: draggedItem.id,
        itemTitle: draggedItem.title,
        currentTheme: draggedItem.theme || null,
      });
    }
  };

  // アイテムのテーマを変更
  const handleAssignTheme = (theme: string | null) => {
    if (themeDialogData.itemId) {
      updateItemTheme({ itemId: themeDialogData.itemId, theme });
    }
  };

  if (!effectiveUserId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">コレクションを表示するにはログインしてください。</p>
      </div>
    );
  }

  if (isItemsLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">まだコレクションに追加されたアイテムがありません。</p>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">選択された条件に一致するアイテムがありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isOwner && (
        <ThemeSelector
          themes={themes}
          activeTheme={activeTheme}
          onThemeChange={setActiveTheme}
          onAddTheme={handleAddTheme}
          onRemoveTheme={handleRemoveTheme}
          onRenameTheme={handleRenameTheme}
        />
      )}
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex justify-center">
          <Button 
            onClick={() => setIsRandomModalOpen(true)}
            className="gap-2"
            variant="outline"
          >
            <Dices className="h-4 w-4" />
            今日のコレクション
          </Button>
        </div>
        
        {isOwner && (
          <div className="flex items-center gap-2">
            {isSelectionMode ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setIsSelectionMode(false); }}
                >
                  キャンセル
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => handleBulkThemeAssign(items, setThemeDialogData)}
                  disabled={selectedItems.length === 0}
                >
                  テーマを設定 ({selectedItems.length})
                </Button>
              </>
            ) : (
              <CollectionActions 
                isCompact={isCompact}
                onTagManage={() => {}}
                onMemoryAdd={() => {}}
                onViewToggle={() => setIsCompact(!isCompact)}
              />
            )}
          </div>
        )}
      </div>
      
      <CollectionGrid
        items={filteredItems}
        isCompact={isCompact}
        isSelectionMode={isSelectionMode}
        selectedItems={selectedItems}
        onSelectItem={handleSelectItem}
        onDragEnd={handleDragEnd}
        activeTheme={activeTheme}
      />

      <RandomCollectionItemModal
        isOpen={isRandomModalOpen}
        onClose={() => setIsRandomModalOpen(false)}
        userId={effectiveUserId}
      />
      
      <ThemeAssignDialog
        isOpen={themeDialogData.isOpen}
        onClose={() => setThemeDialogData(prev => ({ ...prev, isOpen: false }))}
        itemTitle={themeDialogData.itemTitle}
        currentTheme={themeDialogData.currentTheme}
        themes={themes}
        onAssignTheme={
          themeDialogData.itemId === "bulk" 
            ? handleBulkAssignTheme 
            : handleAssignTheme
        }
      />
    </div>
  );
}
