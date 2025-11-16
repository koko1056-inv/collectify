
import { useState, useCallback, memo } from "react";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import { useItemDetails } from "@/hooks/useItemDetails";
import { SearchInput } from "@/components/search/SearchInput";
import { SearchSuggestions } from "@/components/search/SearchSuggestions";
import { ItemDetailsModal } from "@/components/item-details/ItemDetailsModal";
import { Tag } from "@/types";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tags: Tag[];
  selectedContent?: string;
}

interface SearchSuggestion {
  id: string;
  title: string;
  type: 'item' | 'content';
  image?: string;
  price?: string;
  description?: string;
  release_date?: string;
  content_name?: string;
}

export const SearchBar = memo(function SearchBar({
  searchQuery,
  onSearchChange,
}: SearchBarProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isItemDetailsOpen, setIsItemDetailsOpen] = useState(false);
  
  const { suggestions, showSuggestions, setShowSuggestions, isLoading, error } = useSearchSuggestions(searchQuery);
  const { data: itemDetails } = useItemDetails(selectedItemId || "", !!selectedItemId);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('検索入力変更:', value);
    onSearchChange(value);
    setShowSuggestions(value.length >= 2);
  }, [onSearchChange]);

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    console.log('候補クリック:', suggestion);
    onSearchChange(suggestion.title);
    setShowSuggestions(false);
    
    // グッズの場合は詳細モーダルを開く
    if (suggestion.type === 'item') {
      setSelectedItemId(suggestion.id);
      setIsItemDetailsOpen(true);
    }
  }, [onSearchChange]);

  const handleInputFocus = useCallback(() => {
    if (searchQuery.length >= 2) {
      setShowSuggestions(true);
    }
  }, [searchQuery.length]);

  const handleInputBlur = useCallback(() => {
    // 少し遅延を入れてクリックイベントを処理できるようにする
    setTimeout(() => setShowSuggestions(false), 200);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, []);

  const handleModalClose = useCallback(() => {
    setIsItemDetailsOpen(false);
    setSelectedItemId(null);
  }, []);

  return (
    <>
      <div className="max-w-xl mx-auto mb-4 relative">
        <SearchInput
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
        />

        <SearchSuggestions
          suggestions={suggestions}
          showSuggestions={showSuggestions}
          onSuggestionClick={handleSuggestionClick}
          isLoading={isLoading}
          error={error}
        />
      </div>

      {/* アイテム詳細モーダル */}
      {itemDetails && (
        <ItemDetailsModal
          isOpen={isItemDetailsOpen}
          onClose={handleModalClose}
          itemId={itemDetails.id}
          title={itemDetails.title}
          image={itemDetails.image || ""}
          price={itemDetails.price}
          description={itemDetails.description}
          releaseDate={itemDetails.release_date}
          isUserItem={false}
        />
      )}
    </>
  );
});
