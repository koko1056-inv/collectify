import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "./ui/skeleton";
import { useState, useMemo, useCallback } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Button } from "./ui/button";
import {
  Dices,
  Plus,
  Package,
  Camera,
  ArrowUpDown,
  Clock,
  SortAsc,
  Heart,
  Search,
  CheckSquare,
  Tag,
  X,
} from "lucide-react";
import { RandomCollectionItemModal } from "./collection/RandomCollectionItemModal";
import { CollectionViewToggle } from "./collection/CollectionViewToggle";
import { BulkPersonalTagDialog } from "./collection/BulkPersonalTagDialog";
import { useBatchItemMemories } from "@/hooks/useBatchItemMemories";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type SortOption = "newest" | "oldest" | "title" | "content";

interface UserCollectionProps {
  selectedTags: string[];
  userId?: string | null;
  selectedContent?: string;
  onContentChange?: (content: string) => void;
  selectedPersonalTag?: string;
  onPersonalTagChange?: (tag: string) => void;
}

export function UserCollection({
  selectedTags,
  userId,
  selectedContent,
  onContentChange,
  selectedPersonalTag: selectedPersonalTagProp,
  onPersonalTagChange: onPersonalTagChangeProp,
}: UserCollectionProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isCompact, setIsCompact] = useState(false);
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isBulkTagDialogOpen, setIsBulkTagDialogOpen] = useState(false);
  // 親から渡されない場合は内部 state でマイタグ選択を管理（MyRoom 経由など）
  const [internalPersonalTag, setInternalPersonalTag] = useState("");
  const selectedPersonalTag = selectedPersonalTagProp ?? internalPersonalTag;
  const onPersonalTagChange = onPersonalTagChangeProp ?? setInternalPersonalTag;
  const effectiveUserId = userId || user?.id;
  const queryClient = useQueryClient();

  const isOwnCollection = !userId || userId === user?.id;

  const handleRandomModalOpen = useCallback(() => {
    setIsRandomModalOpen(true);
  }, []);

  const handleRandomModalClose = useCallback(() => {
    setIsRandomModalOpen(false);
  }, []);

  const { data: items = [], isLoading: isItemsLoading } = useQuery({
    queryKey: ["user-items", effectiveUserId, selectedTags],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const query = supabase.from("user_items").select(`
          *,
          user_item_tags (
            tags (
              id,
              name
            )
          )
        `).eq("user_id", effectiveUserId).order("created_at", {
        ascending: false
      });
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
    // マウント時に常に再フェッチして、他ページで追加/削除したグッズを即反映する
    refetchOnMount: "always",
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10
  });

  // Batch load memories for all visible items
  const itemIds = useMemo(() => items.map(item => item.id), [items]);
  const { data: batchMemories = {} } = useBatchItemMemories(itemIds);

  // マイタグでフィルタする場合、対象のuser_item_idを取得
  const { data: personalTagItemIds = [], isLoading: isPersonalTagLoading } = useQuery({
    queryKey: ["personal-tag-filter", effectiveUserId, selectedPersonalTag],
    queryFn: async () => {
      if (!selectedPersonalTag || !effectiveUserId) return [];
      const { data, error } = await supabase
        .from("user_personal_tags")
        .select("user_item_id")
        .eq("user_id", effectiveUserId)
        .eq("tag_name", selectedPersonalTag);

      if (error) throw error;
      return data.map(d => d.user_item_id);
    },
    enabled: !!effectiveUserId && !!selectedPersonalTag,
  });

  // content_nameでのフィルタとソートを追加
  const filteredItems = useMemo(() => {
    let filtered = items;
    if (selectedTags.length > 0) {
      filtered = filtered.filter(item =>
        selectedTags.some(tag =>
          item.user_item_tags?.some(itemTag => itemTag.tags?.name === tag)
        )
      );
    }
    if (selectedContent && selectedContent !== "all") {
      filtered = filtered.filter(item => {
        return 'content_name' in item && item.content_name === selectedContent;
      });
    }
    // マイタグでフィルタ
    if (selectedPersonalTag) {
      if (isPersonalTagLoading) {
        // ローディング中は空にせず、現在のフィルタ結果を保持
      } else if (personalTagItemIds.length > 0) {
        filtered = filtered.filter(item => personalTagItemIds.includes(item.id));
      } else {
        filtered = [];
      }
    }
    
    // ソート処理
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "title":
          return (a.title || "").localeCompare(b.title || "", "ja");
        case "content":
          const contentA = 'content_name' in a ? (a.content_name || "") : "";
          const contentB = 'content_name' in b ? (b.content_name || "") : "";
          return contentA.localeCompare(contentB, "ja");
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [items, selectedTags, selectedContent, selectedPersonalTag, personalTagItemIds, isPersonalTagLoading, sortOption]);

  const sortLabels: Record<SortOption, string> = {
    newest: "新しい順",
    oldest: "古い順",
    title: "タイトル順",
    content: "コンテンツ順",
  };

  const sortIcons: Record<SortOption, React.ReactNode> = {
    newest: <Clock className="w-4 h-4" />,
    oldest: <Clock className="w-4 h-4" />,
    title: <SortAsc className="w-4 h-4" />,
    content: <Heart className="w-4 h-4" />,
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      const newItems = arrayMove([...items], oldIndex, newIndex);
      queryClient.setQueryData(["user-items", effectiveUserId, selectedTags], newItems);
    }
  }, [items, queryClient, effectiveUserId, selectedTags]);

  if (!effectiveUserId) {
    return <div className="text-center py-8">
        <p className="text-gray-500">{t("collection.empty")}</p>
      </div>;
  }
  if (isItemsLoading) {
    return <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {[...Array(8)].map((_, i) => <div key={i} className="space-y-3">
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>)}
      </div>;
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
        <Card className="max-w-sm w-full border-dashed border-2 bg-gradient-to-br from-primary/5 to-muted/20">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            {/* メインアイコン */}
            <div className="w-20 h-20 mx-auto relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl animate-pulse" />
              <div className="relative w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/20">
                <Package className="w-10 h-10 text-primary" />
              </div>
            </div>
            
            {/* テキスト */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">
                最初のグッズを追加しよう！
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                あなたの大切なコレクションを<br />記録してみましょう
              </p>
            </div>

            {/* CTAボタン */}
            <div className="space-y-3">
              <Button
                size="lg"
                onClick={() => navigate("/add-item")}
                className="gap-2 w-full h-12 hover-scale shadow-lg"
              >
                <Plus className="w-5 h-5" />
                グッズを追加
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate("/search")} 
                  className="flex-1 gap-1.5"
                >
                  <Search className="w-4 h-4" />
                  発見から探す
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate("/image-search")} 
                  className="flex-1 gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  写真で追加
                </Button>
              </div>
            </div>

            {/* ヒント */}
            <p className="text-xs text-muted-foreground/70">
              💡 ヒント: 写真を撮るだけで自動登録できます
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  const handleToggleSelectionMode = () => {
    setIsSelectionMode((prev) => {
      if (prev) setSelectedItemIds([]);
      return !prev;
    });
  };

  const handleSelectItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItemIds.length === filteredItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredItems.map((i) => i.id));
    }
  };

  const handleBulkComplete = () => {
    setIsSelectionMode(false);
    setSelectedItemIds([]);
  };

  return (
    <div className="space-y-4 my-0 mx-0 px-0 py-px">
      {/* ツールバー */}
      <div className="flex items-center gap-2 mb-4 p-2 bg-muted/30 rounded-xl overflow-x-auto scrollbar-none">
        {!isSelectionMode ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-2 h-9 px-3 rounded-lg bg-background shadow-sm border border-border/50 hover:bg-accent/50 transition-all"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{sortLabels[sortOption]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[160px]">
                {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onClick={() => setSortOption(option)}
                    className={`gap-2 ${sortOption === option ? "bg-accent font-medium" : ""}`}
                  >
                    <span className="text-muted-foreground">{sortIcons[option]}</span>
                    {sortLabels[option]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1 min-w-0" />

            {isOwnCollection && (
              <Button
                onClick={handleToggleSelectionMode}
                variant="ghost"
                size="sm"
                className="shrink-0 gap-2 h-9 px-3 rounded-lg bg-background shadow-sm border border-border/50 hover:bg-accent/50 transition-all"
              >
                <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">選択</span>
              </Button>
            )}

            <Button
              onClick={handleRandomModalOpen}
              variant="ghost"
              size="sm"
              aria-label={t("collection.todaysCollection")}
              className="shrink-0 gap-2 h-9 px-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 hover:from-primary/20 hover:to-accent/20 transition-all group"
            >
              <Dices className="h-3.5 w-3.5 text-primary group-hover:rotate-12 transition-transform" />
              <span className="text-sm font-medium text-primary hidden sm:inline">{t("collection.todaysCollection")}</span>
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-9 px-3 rounded-lg bg-background shadow-sm border border-border/50"
            >
              <span className="text-sm font-medium">
                {selectedItemIds.length === filteredItems.length && filteredItems.length > 0
                  ? "選択解除"
                  : "全て選択"}
              </span>
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedItemIds.length}件選択中
            </span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleSelectionMode}
              className="h-9 px-3 rounded-lg"
            >
              <X className="h-4 w-4 mr-1" />
              キャンセル
            </Button>
          </>
        )}
      </div>

      <CollectionViewToggle
        userId={effectiveUserId}
        items={filteredItems}
        isCompact={isCompact}
        handleDragEnd={handleDragEnd}
        batchMemories={batchMemories}
        selectedPersonalTag={selectedPersonalTag}
        onPersonalTagChange={onPersonalTagChange}
        isSelectionMode={isSelectionMode}
        selectedItems={selectedItemIds}
        onSelectItem={handleSelectItem}
      />

      {/* 選択モード時のフローティングアクションバー */}
      {isSelectionMode && selectedItemIds.length > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 px-4 w-full max-w-md">
          <div className="bg-background/95 backdrop-blur-md border border-border rounded-full shadow-xl flex items-center gap-2 p-2">
            <span className="text-sm font-medium pl-3">
              {selectedItemIds.length}件
            </span>
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={() => setIsBulkTagDialogOpen(true)}
              className="rounded-full gap-1.5"
            >
              <Tag className="w-4 h-4" />
              マイタグを付ける
            </Button>
          </div>
        </div>
      )}

      <BulkPersonalTagDialog
        open={isBulkTagDialogOpen}
        onOpenChange={setIsBulkTagDialogOpen}
        selectedItemIds={selectedItemIds}
        onComplete={handleBulkComplete}
      />

      <RandomCollectionItemModal
        isOpen={isRandomModalOpen}
        onClose={handleRandomModalClose}
        userId={effectiveUserId}
      />
    </div>
  );
}
