
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tag } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ItemDetailsModal } from "@/components/item-details/ItemDetailsModal";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tags: Tag[];
}

interface SearchSuggestion {
  id: string;
  title: string;
  type: 'item' | 'content';
}

interface ItemDetails {
  id: string;
  title: string;
  image: string;
  price?: string;
  description?: string;
  release_date?: string;
}

export function SearchBar({
  searchQuery,
  onSearchChange,
}: SearchBarProps) {
  const isMobile = useIsMobile();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isItemDetailsOpen, setIsItemDetailsOpen] = useState(false);

  // 検索候補を取得
  const { data: searchSuggestions = [] } = useQuery({
    queryKey: ["search-suggestions", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      // 商品タイトルから候補を取得
      const { data: items, error: itemsError } = await supabase
        .from("official_items")
        .select("id, title")
        .ilike("title", `%${searchQuery}%`)
        .limit(5);

      // コンテンツ名から候補を取得
      const { data: contents, error: contentsError } = await supabase
        .from("content_names")
        .select("id, name")
        .ilike("name", `%${searchQuery}%`)
        .limit(3);

      if (itemsError || contentsError) {
        console.error("Error fetching suggestions:", itemsError || contentsError);
        return [];
      }

      const suggestions: SearchSuggestion[] = [
        ...(items || []).map(item => ({
          id: item.id,
          title: item.title,
          type: 'item' as const
        })),
        ...(contents || []).map(content => ({
          id: content.id,
          title: content.name,
          type: 'content' as const
        }))
      ];

      return suggestions;
    },
    enabled: searchQuery.length >= 2,
  });

  // 選択されたアイテムの詳細を取得
  const { data: selectedItemDetails } = useQuery({
    queryKey: ["item-details", selectedItemId],
    queryFn: async () => {
      if (!selectedItemId) return null;

      const { data, error } = await supabase
        .from("official_items")
        .select("id, title, image, price, description, release_date")
        .eq("id", selectedItemId)
        .single();

      if (error) {
        console.error("Error fetching item details:", error);
        return null;
      }

      return data as ItemDetails;
    },
    enabled: !!selectedItemId,
  });

  useEffect(() => {
    setSuggestions(searchSuggestions);
  }, [searchSuggestions]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onSearchChange(value);
    setShowSuggestions(value.length >= 2);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onSearchChange(suggestion.title);
    setShowSuggestions(false);
    
    // グッズの場合は詳細モーダルを開く
    if (suggestion.type === 'item') {
      setSelectedItemId(suggestion.id);
      setIsItemDetailsOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (searchQuery.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // 少し遅延を入れてクリックイベントを処理できるようにする
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <>
      <div className="max-w-xl mx-auto mb-4 relative">
        <div className="relative">
          <Input
            type="text"
            placeholder="グッズを検索..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="pl-10 bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Search className="h-5 w-5" />
          </div>
        </div>

        {/* 検索候補のドロップダウン */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <div
                key={`${suggestion.type}-${suggestion.id}`}
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <Search className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{suggestion.title}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {suggestion.type === 'item' ? 'グッズ' : 'コンテンツ'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* アイテム詳細モーダル */}
      {selectedItemDetails && (
        <ItemDetailsModal
          isOpen={isItemDetailsOpen}
          onClose={() => {
            setIsItemDetailsOpen(false);
            setSelectedItemId(null);
          }}
          itemId={selectedItemDetails.id}
          title={selectedItemDetails.title}
          image={selectedItemDetails.image}
          price={selectedItemDetails.price}
          description={selectedItemDetails.description}
          releaseDate={selectedItemDetails.release_date}
        />
      )}
    </>
  );
}
