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
import { Search, Filter, X, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTags } from "@/hooks/useTags";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  const {
    user
  } = useAuth();
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    title: string;
    image: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [selectedContentNames, setSelectedContentNames] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [contentSearchQuery, setContentSearchQuery] = useState("");
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
  const {
    data: allTags = []
  } = useTags();
  const {
    data: userItems,
    isLoading
  } = useQuery({
    queryKey: ["user-items-with-tags", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const {
        data,
        error
      } = await supabase.from("user_items").select(`
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
        `).eq("user_id", user.id).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isOpen
  });

  // コンテンツ名を取得
  const {
    data: contentNames = []
  } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("content_names").select("*").order("name");
      if (error) throw error;
      return data;
    }
  });

  // グッズタイプのタグだけをフィルタリング
  const typeTags = allTags.filter(tag => tag.category === 'type');

  // フィルタリングされたコンテンツ名
  const filteredContentNames = contentNames.filter(content => content.name.toLowerCase().includes(contentSearchQuery.toLowerCase()));

  // 人気のコンテンツ名（最初の5つ）
  const popularContentNames = contentNames.slice(0, 5);

  // 検索、フィルタ、ソートロジック
  const filteredAndSortedItems = userItems ? userItems.filter(item => {
    // テキスト検索
    const matchesSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.content_name && item.content_name.toLowerCase().includes(searchQuery.toLowerCase());

    // コンテンツ名フィルタ
    const matchesContentFilter = selectedContentNames.length === 0 || item.content_name && selectedContentNames.includes(item.content_name);

    // タグフィルタ
    const matchesTagFilter = selectedTags.length === 0 || selectedTags.every(selectedTag => item.user_item_tags?.some(itemTag => itemTag.tags?.name === selectedTag));

    // タグの有無フィルタ
    const hasTags = item.user_item_tags && item.user_item_tags.length > 0;
    const matchesTagPresenceFilter = filterBy === "all" || filterBy === "withTags" && hasTags || filterBy === "noTags" && !hasTags;
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
  const handleItemSelect = (item: {
    id: string;
    title: string;
    image: string;
  }) => {
    setSelectedItem(item);
  };
  const handleClosePostModal = () => {
    setSelectedItem(null);
    setSearchQuery("");
    setSelectedContentNames([]);
    setSelectedTags([]);
    setSortBy("newest");
    setFilterBy("all");
    setShowFilters(false);
    onClose();
  };
  const handleContentNameToggle = (contentName: string) => {
    setSelectedContentNames(prev => prev.includes(contentName) ? prev.filter(name => name !== contentName) : [...prev, contentName]);
  };
  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev => prev.includes(tagName) ? prev.filter(name => name !== tagName) : [...prev, tagName]);
  };
  const clearAllFilters = () => {
    setSelectedContentNames([]);
    setSelectedTags([]);
    setFilterBy("all");
    setSearchQuery("");
  };
  const hasActiveFilters = selectedContentNames.length > 0 || selectedTags.length > 0 || filterBy !== "all" || searchQuery;
  const getContentDisplayText = () => {
    if (selectedContentNames.length === 0) return "コンテンツで絞り込む";
    if (selectedContentNames.length === 1) return selectedContentNames[0];
    return `${selectedContentNames.length}個のコンテンツ`;
  };
  if (selectedItem) {
    return <CreatePostModal isOpen={true} onClose={handleClosePostModal} userItemId={selectedItem.id} userItemTitle={selectedItem.title} userItemImage={selectedItem.image} />;
  }
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] w-[95vw] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">投稿するグッズを選択</DialogTitle>
        </DialogHeader>
        
        {/* 検索バー */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input type="text" placeholder="グッズ名やコンテンツ名で検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {/* コンテンツフィルタ */}
        

        {/* タグフィルタ（水平スクロール） */}
        {typeTags.length > 0 && <div className="mb-4">
            <ScrollArea className="w-full whitespace-nowrap">
              
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>}

        {/* フィルタとソートのコントロール */}
        

        {/* 選択されたフィルタの表示 */}
        {(selectedContentNames.length > 0 || selectedTags.length > 0) && <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {selectedContentNames.map(contentName => <Badge key={contentName} variant="secondary" className="text-xs">
                  {contentName}
                  <button onClick={() => handleContentNameToggle(contentName)} className="ml-1 hover:bg-gray-300 rounded-full">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>)}
              {selectedTags.map(tagName => <Badge key={tagName} variant="outline" className="text-xs border-purple-300 text-purple-700">
                  {tagName}
                  <button onClick={() => handleTagToggle(tagName)} className="ml-1 hover:bg-purple-100 rounded-full">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>)}
            </div>
          </div>}

        {/* 結果の表示 */}
        
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 p-2">
              {[...Array(21)].map((_, i) => <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="w-full h-32 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>)}
            </div> : filteredAndSortedItems.length > 0 ? <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 p-2">
              {filteredAndSortedItems.map(item => <Button key={item.id} variant="outline" onClick={() => handleItemSelect(item)} className="flex flex-col items-center p-3 h-auto space-y-2 hover:shadow-md transition-shadow min-h-[180px]">
                  <img src={item.image} alt={item.title} className="w-full h-24 md:h-28 lg:h-32 object-cover rounded flex-shrink-0" />
                  <div className="text-left w-full flex-1 flex flex-col justify-between">
                    <div className="font-medium text-xs line-clamp-2 leading-tight">{item.title}</div>
                    {item.content_name && <div className="text-xs text-gray-500 mt-1 line-clamp-1">{item.content_name}</div>}
                    {item.user_item_tags && item.user_item_tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">
                        {item.user_item_tags.slice(0, 2).map((itemTag, index) => itemTag.tags && <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded text-[10px] leading-tight">
                              {itemTag.tags.name}
                            </span>)}
                        {item.user_item_tags.length > 2 && <span className="text-xs text-gray-500">
                            +{item.user_item_tags.length - 2}
                          </span>}
                      </div>}
                  </div>
                </Button>)}
            </div> : searchQuery || selectedContentNames.length > 0 || selectedTags.length > 0 ? <div className="text-center py-16">
              <p className="text-gray-500 text-lg">検索条件に一致するグッズが見つかりません</p>
              <p className="text-sm text-gray-400 mt-2">
                検索条件を変更してみてください
              </p>
            </div> : <div className="text-center py-16">
              <p className="text-gray-500 text-lg">投稿できるグッズがありません</p>
              <p className="text-sm text-gray-400 mt-2">
                まずはコレクションにグッズを追加してください
              </p>
            </div>}
        </div>
      </DialogContent>
    </Dialog>;
}