
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "./ui/skeleton";
import { useState, useMemo, useEffect } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { CollectionGrid } from "./collection/CollectionGrid";
import { Button } from "./ui/button";
import { Dices } from "lucide-react";
import { RandomCollectionItemModal } from "./collection/RandomCollectionItemModal";
import { ThemeSelector } from "./collection/ThemeSelector";
import { ThemeAssignDialog } from "./collection/ThemeAssignDialog";
import { toast } from "sonner";
import { CollectionActions } from "./collection/CollectionActions";

interface UserCollectionProps {
  selectedTags: string[];
  userId?: string | null;
}

export function UserCollection({ selectedTags, userId }: UserCollectionProps) {
  const { user } = useAuth();
  const [isCompact, setIsCompact] = useState(false);
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [themes, setThemes] = useState<string[]>([]);
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
  const queryClient = useQueryClient();
  const isOwner = !userId && !!user;

  // ユーザーのテーマ設定を取得
  const { data: userThemes = [] } = useQuery({
    queryKey: ["user-themes", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("themes")
        .eq("id", effectiveUserId)
        .single();
      
      if (error) {
        console.error("Error fetching themes:", error);
        return [];
      }
      
      return data?.themes || [];
    },
    enabled: !!effectiveUserId,
  });

  // テーマを更新する
  const { mutate: updateThemes } = useMutation({
    mutationFn: async (newThemes: string[]) => {
      if (!user?.id) throw new Error("ユーザーがログインしていません");
      
      const { error } = await supabase
        .from("profiles")
        .update({ themes: newThemes })
        .eq("id", user.id);
      
      if (error) throw error;
      return newThemes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-themes", user?.id] });
    },
    onError: (error) => {
      console.error("テーマの更新に失敗しました:", error);
      toast.error("テーマの更新に失敗しました");
    },
  });

  // アイテムのテーマを更新する
  const { mutate: updateItemTheme } = useMutation({
    mutationFn: async ({ itemId, theme }: { itemId: string; theme: string | null }) => {
      if (!user?.id) throw new Error("ユーザーがログインしていません");
      
      const { error } = await supabase
        .from("user_items")
        .update({ theme: theme })
        .eq("id", itemId)
        .eq("user_id", user.id);
      
      if (error) throw error;
      return { itemId, theme };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-items", user?.id, selectedTags] });
      toast.success("テーマを更新しました");
    },
    onError: (error) => {
      console.error("テーマの更新に失敗しました:", error);
      toast.error("テーマの更新に失敗しました");
    },
  });

  // テーマリストを設定
  useEffect(() => {
    if (userThemes && Array.isArray(userThemes)) {
      setThemes(userThemes);
    }
  }, [userThemes]);

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
      return data || [];
    },
    enabled: !!effectiveUserId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const filteredItems = useMemo(() => {
    let result = [...items];
    
    // タグでフィルタリング
    if (selectedTags.length > 0) {
      result = result.filter(item => 
        selectedTags.every(tag => 
          item.user_item_tags?.some(itemTag => itemTag.tags?.name === tag)
        )
      );
    }
    
    // テーマでフィルタリング
    if (activeTheme !== null) {
      result = result.filter(item => item.theme === activeTheme);
    }
    
    return result;
  }, [items, selectedTags, activeTheme]);

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

  // テーマを追加
  const handleAddTheme = (theme: string) => {
    if (!themes.includes(theme)) {
      const newThemes = [...themes, theme];
      setThemes(newThemes);
      updateThemes(newThemes);
      toast.success(`テーマ「${theme}」を追加しました`);
    }
  };

  // テーマを削除
  const handleRemoveTheme = (theme: string) => {
    const newThemes = themes.filter(t => t !== theme);
    setThemes(newThemes);
    updateThemes(newThemes);
    
    // 削除されたテーマを持つアイテムのテーマをクリア
    if (user?.id) {
      supabase
        .from("user_items")
        .update({ theme: null })
        .eq("user_id", user.id)
        .eq("theme", theme)
        .then(({ error }) => {
          if (error) {
            console.error("テーマの削除に失敗しました:", error);
            return;
          }
          queryClient.invalidateQueries({ queryKey: ["user-items", user.id, selectedTags] });
        });
    }
    
    if (activeTheme === theme) {
      setActiveTheme(null);
    }
    
    toast.success(`テーマ「${theme}」を削除しました`);
  };

  // テーマ名を変更
  const handleRenameTheme = (oldName: string, newName: string) => {
    if (themes.includes(newName)) {
      toast.error(`テーマ「${newName}」は既に存在します`);
      return;
    }
    
    const newThemes = themes.map(t => t === oldName ? newName : t);
    setThemes(newThemes);
    updateThemes(newThemes);
    
    // 古いテーマ名を持つアイテムのテーマ名を更新
    if (user?.id) {
      supabase
        .from("user_items")
        .update({ theme: newName })
        .eq("user_id", user.id)
        .eq("theme", oldName)
        .then(({ error }) => {
          if (error) {
            console.error("テーマ名の変更に失敗しました:", error);
            return;
          }
          queryClient.invalidateQueries({ queryKey: ["user-items", user.id, selectedTags] });
        });
    }
    
    if (activeTheme === oldName) {
      setActiveTheme(newName);
    }
    
    toast.success(`テーマ名を「${oldName}」から「${newName}」に変更しました`);
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId) 
        : [...prev, itemId]
    );
  };

  const handleBulkThemeAssign = () => {
    if (selectedItems.length === 0) return;
    
    // 選択されたアイテムの最初のアイテムでダイアログを開く
    const firstItem = items.find(item => item.id === selectedItems[0]);
    if (firstItem) {
      setThemeDialogData({
        isOpen: true,
        itemId: "bulk", // 一括操作用の特殊ID
        itemTitle: `選択した${selectedItems.length}個のアイテム`,
        currentTheme: null,
      });
    }
  };

  // 一括テーマ変更
  const handleBulkAssignTheme = (theme: string | null) => {
    if (themeDialogData.itemId === "bulk" && selectedItems.length > 0) {
      // 選択された全アイテムのテーマを変更
      Promise.all(
        selectedItems.map(itemId => 
          supabase
            .from("user_items")
            .update({ theme: theme })
            .eq("id", itemId)
            .eq("user_id", user?.id)
        )
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: ["user-items", user?.id, selectedTags] });
        toast.success(`${selectedItems.length}個のアイテムのテーマを更新しました`);
        setSelectedItems([]);
        setIsSelectionMode(false);
      }).catch(error => {
        console.error("テーマの一括更新に失敗しました:", error);
        toast.error("テーマの一括更新に失敗しました");
      });
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
                  onClick={() => { setIsSelectionMode(false); setSelectedItems([]); }}
                >
                  キャンセル
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleBulkThemeAssign}
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
