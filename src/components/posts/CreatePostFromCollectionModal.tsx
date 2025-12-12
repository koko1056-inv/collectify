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
import { Search, X, Plus } from "lucide-react";
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
      <DialogContent className="max-w-6xl max-h-[95vh] w-[95vw] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-base font-bold">{t("posts.selectGoods")}</DialogTitle>
          <div className="flex items-center gap-2">
            {!isSelectionMode && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsSelectionMode(true)}
                >
                  {t("posts.multiSelect")}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    onClose();
                    navigate('/add-item');
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {t("posts.addGoods")}
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        {isSelectionMode && (
          <div className="pb-3 border-b">
            <SelectionModeControls
              selectedItems={selectedItemIds}
              totalItems={filteredAndSortedItems.length}
              onSelectAll={handleSelectAll}
              onConfirm={handleConfirmSelection}
              onCancel={handleCancelSelection}
            />
          </div>
        )}
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            type="text" 
            placeholder={t("posts.searchGoods")} 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="pl-10" 
          />
        </div>

        {typeTags.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">{t("posts.filterByType")}</div>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex space-x-2 pb-2">
                {typeTags.map(tag => (
                  <Button 
                    key={tag.id} 
                    variant={selectedTags.includes(tag.name) ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => handleTagToggle(tag.name)} 
                    className="whitespace-nowrap"
                  >
                    {tag.name}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {(selectedContentNames.length > 0 || selectedTags.length > 0) && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {selectedContentNames.map(contentName => (
                <Badge key={contentName} variant="secondary" className="text-xs">
                  {contentName}
                  <button 
                    onClick={() => handleContentNameToggle(contentName)} 
                    className="ml-1 hover:bg-muted rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedTags.map(tagName => (
                <Badge key={tagName} variant="outline" className="text-xs border-primary/30 text-primary">
                  {tagName}
                  <button 
                    onClick={() => handleTagToggle(tagName)} 
                    className="ml-1 hover:bg-primary/10 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 p-2">
              {[...Array(21)].map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="w-full h-32 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedItems.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 p-2">
              {filteredAndSortedItems.map(item => (
                <div key={item.id} className="relative">
                  {isSelectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedItemIds.includes(item.id)}
                        onCheckedChange={() => handleItemToggle(item.id)}
                        className="bg-background border-2"
                      />
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => handleItemSelect(item)} 
                    className="flex flex-col items-center p-3 h-auto space-y-2 hover:shadow-md transition-shadow min-h-[180px] w-full"
                  >
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-24 md:h-28 lg:h-32 object-cover rounded flex-shrink-0" 
                    />
                    <div className="text-left w-full flex-1 flex flex-col justify-between">
                      <div className="font-medium text-xs line-clamp-2 leading-tight">{item.title}</div>
                      {item.content_name && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.content_name}</div>
                      )}
                    </div>
                  </Button>
                </div>
              ))}
            </div>
          ) : searchQuery || selectedContentNames.length > 0 || selectedTags.length > 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">{t("posts.noSearchResults")}</p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                {t("posts.changeSearchCondition")}
              </p>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">{t("posts.noGoodsToPost")}</p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                {t("posts.addGoodsFirst")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
