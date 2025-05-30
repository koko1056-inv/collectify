
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
import { Search, Filter, SortAsc } from "lucide-react";

interface CreatePostFromCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SortOption = "newest" | "oldest" | "title";
type FilterOption = "all" | "withTags" | "noTags";

export function CreatePostFromCollectionModal({
  isOpen,
  onClose,
}: CreatePostFromCollectionModalProps) {
  const { user } = useAuth();
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    title: string;
    image: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [selectedContentNames, setSelectedContentNames] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

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
    enabled: !!user && isOpen,
  });

  // ユニークなコンテンツ名を取得
  const uniqueContentNames = userItems ? 
    [...new Set(userItems.map(item => item.content_name).filter(Boolean))] : [];

  // 検索、フィルタ、ソートロジック
  const filteredAndSortedItems = userItems ? userItems
    .filter(item => {
      // テキスト検索
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.content_name && item.content_name.toLowerCase().includes(searchQuery.toLowerCase()));

      // コンテンツ名フィルタ
      const matchesContentFilter = selectedContentNames.length === 0 || 
        (item.content_name && selectedContentNames.includes(item.content_name));

      // タグの有無フィルタ
      const hasTags = item.user_item_tags && item.user_item_tags.length > 0;
      const matchesTagFilter = filterBy === "all" || 
        (filterBy === "withTags" && hasTags) ||
        (filterBy === "noTags" && !hasTags);

      return matchesSearch && matchesContentFilter && matchesTagFilter;
    })
    .sort((a, b) => {
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
    setSelectedItem(item);
  };

  const handleClosePostModal = () => {
    setSelectedItem(null);
    setSearchQuery("");
    setSelectedContentNames([]);
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

  if (selectedItem) {
    return (
      <CreatePostModal
        isOpen={true}
        onClose={handleClosePostModal}
        userItemId={selectedItem.id}
        userItemTitle={selectedItem.title}
        userItemImage={selectedItem.image}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>投稿するグッズを選択</DialogTitle>
        </DialogHeader>
        
        {/* 検索バー */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="グッズ名やコンテンツ名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* フィルタとソートのコントロール */}
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            フィルタ
          </Button>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
            <option value="title">名前順</option>
          </select>

          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="all">すべて</option>
            <option value="withTags">タグあり</option>
            <option value="noTags">タグなし</option>
          </select>
        </div>

        {/* コンテンツ名フィルタ */}
        {showFilters && uniqueContentNames.length > 0 && (
          <div className="mb-4 p-3 border rounded bg-gray-50">
            <h4 className="text-sm font-medium mb-2">コンテンツで絞り込み</h4>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {uniqueContentNames.map((contentName) => (
                <div key={contentName} className="flex items-center space-x-2">
                  <Checkbox
                    id={contentName}
                    checked={selectedContentNames.includes(contentName)}
                    onCheckedChange={() => handleContentNameToggle(contentName)}
                  />
                  <label
                    htmlFor={contentName}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {contentName}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 結果の表示 */}
        <div className="text-sm text-gray-500 mb-2">
          {filteredAndSortedItems.length}件のグッズが見つかりました
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="w-16 h-16 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {filteredAndSortedItems.map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  onClick={() => handleItemSelect(item)}
                  className="flex items-center justify-start p-3 h-auto"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded mr-3"
                  />
                  <div className="text-left flex-1">
                    <div className="font-medium">{item.title}</div>
                    {item.content_name && (
                      <div className="text-sm text-gray-500">{item.content_name}</div>
                    )}
                    {item.user_item_tags && item.user_item_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.user_item_tags.slice(0, 3).map((itemTag, index) => (
                          itemTag.tags && (
                            <span
                              key={index}
                              className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                            >
                              {itemTag.tags.name}
                            </span>
                          )
                        ))}
                        {item.user_item_tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{item.user_item_tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          ) : searchQuery || selectedContentNames.length > 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">検索条件に一致するグッズが見つかりません</p>
              <p className="text-sm text-gray-400 mt-2">
                検索条件を変更してみてください
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">投稿できるグッズがありません</p>
              <p className="text-sm text-gray-400 mt-2">
                まずはコレクションにグッズを追加してください
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
