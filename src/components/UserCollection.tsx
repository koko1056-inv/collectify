import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "./ui/skeleton";
import { useState, useMemo, useCallback } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Button } from "./ui/button";
import { Dices, Plus, Sparkles, Package, Camera, ArrowUpDown, Clock, SortAsc, Heart } from "lucide-react";
import { RandomCollectionItemModal } from "./collection/RandomCollectionItemModal";
import { CollectionViewToggle } from "./collection/CollectionViewToggle";
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
}

export function UserCollection({
  selectedTags,
  userId,
  selectedContent,
  onContentChange,
  selectedPersonalTag,
}: UserCollectionProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isCompact, setIsCompact] = useState(false);
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const effectiveUserId = userId || user?.id;
  const queryClient = useQueryClient();

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
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10
  });

  // Batch load memories for all visible items
  const itemIds = useMemo(() => items.map(item => item.id), [items]);
  const { data: batchMemories = {} } = useBatchItemMemories(itemIds);

  // マイタグでフィルタする場合、対象のuser_item_idを取得
  const { data: personalTagItemIds = [] } = useQuery({
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
    if (selectedPersonalTag && personalTagItemIds.length > 0) {
      filtered = filtered.filter(item => personalTagItemIds.includes(item.id));
    } else if (selectedPersonalTag && personalTagItemIds.length === 0) {
      filtered = [];
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
  }, [items, selectedTags, selectedContent, selectedPersonalTag, personalTagItemIds, sortOption]);

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
                onClick={() => navigate("/quick-add")} 
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
                  <Sparkles className="w-4 h-4" />
                  公式から探す
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
  if (filteredItems.length === 0) {
    return <div className="text-center py-8">
        <p className="text-gray-500">{t("collection.noMatches")}</p>
      </div>;
  }
  return (
    <div className="space-y-4 my-0 mx-0 px-0 py-px">
      <div className="flex items-center justify-between gap-2 mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowUpDown className="h-4 w-4" />
              {sortLabels[sortOption]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(Object.keys(sortLabels) as SortOption[]).map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() => setSortOption(option)}
                className={sortOption === option ? "bg-accent" : ""}
              >
                <span className="mr-2">{sortIcons[option]}</span>
                {sortLabels[option]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={handleRandomModalOpen} variant="outline" size="sm" className="gap-2">
          <Dices className="h-4 w-4" />
          {t("collection.todaysCollection")}
        </Button>
      </div>
      
      <CollectionViewToggle 
        userId={effectiveUserId} 
        items={filteredItems} 
        isCompact={isCompact} 
        handleDragEnd={handleDragEnd} 
        batchMemories={batchMemories} 
      />

      <RandomCollectionItemModal 
        isOpen={isRandomModalOpen} 
        onClose={handleRandomModalClose} 
        userId={effectiveUserId} 
      />
    </div>
  );
}
