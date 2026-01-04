import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreatePostModal } from "./CreatePostModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Plus, ImageIcon, CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTags } from "@/hooks/useTags";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { SelectionModeControls } from "@/components/collection/SelectionModeControls";
import { useCreatePost } from "@/hooks/posts";
import { useLanguage } from "@/contexts/LanguageContext";

interface CreatePostFromCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SortOption = "newest" | "oldest" | "title";
type FilterOption = "all" | "withTags" | "noTags";

export function CreatePostFromCollectionModal({
  isOpen,
  onClose
}: CreatePostFromCollectionModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const createPost = useCreatePost();
  const [selectedItems, setSelectedItems] = useState<Array<{
    id: string;
    title: string;
    image: string;
  }> | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [selectedContentNames, setSelectedContentNames] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [contentSearchQuery, setContentSearchQuery] = useState("");
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);

  const { data: allTags = [] } = useTags();

  const { data: userItems, isLoading } = useQuery({
    queryKey: ["user-items-with-tags", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_items")
        .select(`
          id, 
          title, 
          image, 
          content_name, 
          created_at,
          user_item_tags (
            tags (
              id,
              name,
              category
            )
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isOpen
  });

  const { data: contentNames = [] } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_names")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  const typeTags = allTags.filter(tag => tag.category === 'type');
  const filteredContentNames = contentNames.filter(content => 
    content.name && content.name.toLowerCase().includes(contentSearchQuery.toLowerCase())
  );
  const popularContentNames = contentNames.slice(0, 5);

  const filteredAndSortedItems = userItems ? userItems.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.content_name && item.content_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesContentFilter = selectedContentNames.length === 0 || 
      (item.content_name && selectedContentNames.includes(item.content_name));

    const matchesTagFilter = selectedTags.length === 0 || 
      selectedTags.every(selectedTag => 
        item.user_item_tags?.some(itemTag => itemTag.tags?.name === selectedTag)
      );

    const hasTags = item.user_item_tags && item.user_item_tags.length > 0;
    const matchesTagPresenceFilter = filterBy === "all" || 
      (filterBy === "withTags" && hasTags) || 
      (filterBy === "noTags" && !hasTags);

    return matchesSearch && matchesContentFilter && matchesTagFilter && matchesTagPresenceFilter;
  }).sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "newest":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  }) : [];

  const handleItemSelect = (item: { id: string; title: string; image: string }) => {
    if (isSelectionMode) {
      handleItemToggle(item.id);
    } else {
      setSelectedItems([item]);
    }
  };

  const handleItemToggle = (itemId: string) => {
    setSelectedItemIds(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItemIds.length === filteredAndSortedItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredAndSortedItems.map(item => item.id));
    }
  };

  const handleConfirmSelection = () => {
    if (selectedItemIds.length === 0) return;
    const items = userItems?.filter(item => selectedItemIds.includes(item.id)).map(item => ({
      id: item.id,
      title: item.title,
      image: item.image
    })) || [];
    setSelectedItems(items);
  };

  const handleCancelSelection = () => {
    setSelectedItemIds([]);
    setIsSelectionMode(false);
  };

  const handleClosePostModal = () => {
    setSelectedItems(null);
    setSelectedItemIds([]);
    setIsSelectionMode(false);
    setSearchQuery("");
    setSelectedContentNames([]);
    setSelectedTags([]);
    setSortBy("newest");
    setFilterBy("all");
    setShowFilters(false);
    onClose();
  };

  const handleContentNameToggle = (contentName: string) => {
    setSelectedContentNames(prev => 
      prev.includes(contentName) 
        ? prev.filter(name => name !== contentName) 
        : [...prev, contentName]
    );
  };

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(name => name !== tagName) 
        : [...prev, tagName]
    );
  };

  const clearAllFilters = () => {
    setSelectedContentNames([]);
    setSelectedTags([]);
    setFilterBy("all");
    setSearchQuery("");
  };

  const hasActiveFilters = selectedContentNames.length > 0 || selectedTags.length > 0 || filterBy !== "all" || searchQuery;

  if (selectedItems) {
    return (
      <CreatePostModal 
        isOpen={true} 
        onClose={handleClosePostModal} 
        selectedItems={selectedItems}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] w-[95vw] overflow-hidden flex flex-col p-0">
        {/* ヘッダー部分 */}
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-5 py-4 border-b">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-sm">
                1
              </div>
              <div className="text-xs text-muted-foreground">/ 2</div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">投稿するグッズを選択</h2>
              <p className="text-sm text-muted-foreground">
                {isSelectionMode ? "複数選択中 - チェックを入れて確定してください" : "タップで選択、または複数選択モードを使用"}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className="px-3 py-1.5 rounded-full bg-background border flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-primary" />
                <span>{filteredAndSortedItems.length}</span>
              </div>
            </div>
          </div>
          
          {/* アクションボタン */}
          <div className="flex items-center gap-2">
            {!isSelectionMode ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsSelectionMode(true)}
                  className="bg-background hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  複数選択
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    onClose();
                    navigate('/add-item');
                  }}
                  className="bg-background hover:bg-background"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  新しく追加
                </Button>
              </>
            ) : (
              <div className="w-full bg-primary/5 rounded-lg p-2">
                <SelectionModeControls
                  selectedItems={selectedItemIds}
                  totalItems={filteredAndSortedItems.length}
                  onSelectAll={handleSelectAll}
                  onConfirm={handleConfirmSelection}
                  onCancel={handleCancelSelection}
                />
              </div>
            )}
          </div>
        </div>

        {/* 検索・フィルター */}
        <div className="px-4 py-3 space-y-3 border-b bg-background">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              type="text" 
              placeholder="グッズ名・コンテンツ名で検索..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="pl-10 h-10" 
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {typeTags.length > 0 && (
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-1">
                {typeTags.map(tag => (
                  <Button 
                    key={tag.id} 
                    variant={selectedTags.includes(tag.name) ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => handleTagToggle(tag.name)} 
                    className="whitespace-nowrap h-8 text-xs rounded-full"
                  >
                    {tag.name}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedContentNames.map(contentName => (
                <Badge key={contentName} variant="secondary" className="text-xs py-1 pr-1">
                  {contentName}
                  <button 
                    onClick={() => handleContentNameToggle(contentName)} 
                    className="ml-1 p-0.5 hover:bg-muted rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedTags.map(tagName => (
                <Badge key={tagName} className="text-xs py-1 pr-1 bg-primary/10 text-primary border-0">
                  {tagName}
                  <button 
                    onClick={() => handleTagToggle(tagName)} 
                    className="ml-1 p-0.5 hover:bg-primary/20 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                すべてクリア
              </Button>
            </div>
          )}
        </div>
        
        {/* グッズ一覧 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="flex flex-col space-y-2">
                  <Skeleton className="w-full aspect-square rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredAndSortedItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredAndSortedItems.map(item => {
                const isSelected = selectedItemIds.includes(item.id);
                return (
                  <div 
                    key={item.id} 
                    className="group relative cursor-pointer"
                    onClick={() => handleItemSelect(item)}
                  >
                    {isSelectionMode && (
                      <div className="absolute top-2 left-2 z-10">
                        <div className={`
                          h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all
                          ${isSelected 
                            ? 'bg-primary border-primary text-primary-foreground' 
                            : 'bg-background/80 border-muted-foreground/30 backdrop-blur-sm'}
                        `}>
                          {isSelected && <CheckCircle2 className="h-4 w-4" />}
                        </div>
                      </div>
                    )}
                    <div className={`
                      relative rounded-xl overflow-hidden transition-all duration-200
                      ${isSelected 
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                        : 'hover:ring-2 hover:ring-primary/50 hover:ring-offset-1 hover:ring-offset-background'}
                      bg-card shadow-sm hover:shadow-md
                    `}>
                      <div className="aspect-square overflow-hidden bg-muted">
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                          loading="lazy"
                        />
                      </div>
                      <div className="p-2.5">
                        <p className="font-medium text-xs line-clamp-2 leading-tight">{item.title}</p>
                        {item.content_name && (
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{item.content_name}</p>
                        )}
                      </div>
                      
                      {/* ホバー時のオーバーレイ */}
                      {!isSelectionMode && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                            <Sparkles className="h-3.5 w-3.5" />
                            選択して投稿
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : hasActiveFilters ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">検索結果がありません</p>
              <p className="text-sm text-muted-foreground mt-2">
                条件を変更してもう一度お試しください
              </p>
              <Button 
                variant="outline" 
                onClick={clearAllFilters}
                className="mt-4"
              >
                フィルターをクリア
              </Button>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <ImageIcon className="h-10 w-10 text-primary" />
              </div>
              <p className="text-lg font-medium">グッズがありません</p>
              <p className="text-sm text-muted-foreground mt-2">
                コレクションにグッズを追加しましょう
              </p>
              <Button 
                onClick={() => {
                  onClose();
                  navigate('/add-item');
                }}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                グッズを追加
              </Button>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            グッズをタップして次のステップへ
          </p>
          {isSelectionMode && selectedItemIds.length > 0 && (
            <Button onClick={handleConfirmSelection} size="sm">
              {selectedItemIds.length}件を選択して次へ
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}