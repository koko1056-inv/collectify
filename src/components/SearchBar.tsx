import { useState } from "react";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useItemDetails } from "@/hooks/useItemDetails";
import { SearchInput } from "@/components/search/SearchInput";
import { SearchSuggestions } from "@/components/search/SearchSuggestions";
import { SearchHistory } from "@/components/search/SearchHistory";
import { ItemDetailsModal } from "@/components/item-details/ItemDetailsModal";
import { ProgressiveTooltip } from "@/components/onboarding/ProgressiveTooltip";
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

export function SearchBar({
  searchQuery,
  onSearchChange,
}: SearchBarProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isItemDetailsOpen, setIsItemDetailsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const { suggestions, showSuggestions, setShowSuggestions, isLoading, error } = useSearchSuggestions(searchQuery);
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();
  const { data: itemDetails } = useItemDetails(selectedItemId || "", !!selectedItemId);

  // 履歴を表示するかどうか（フォーカス中かつ検索クエリが空または短い場合）
  const showHistory = isFocused && searchQuery.length < 2 && !showSuggestions;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onSearchChange(value);
    setShowSuggestions(value.length >= 2);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onSearchChange(suggestion.title);
    setShowSuggestions(false);
    addToHistory(suggestion.title);
    
    // グッズの場合は詳細モーダルを開く
    if (suggestion.type === 'item') {
      setSelectedItemId(suggestion.id);
      setIsItemDetailsOpen(true);
    }
  };

  const handleHistoryClick = (query: string) => {
    onSearchChange(query);
    setIsFocused(false);
    addToHistory(query); // 使用したので先頭に移動
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    if (searchQuery.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // 少し遅延を入れてクリックイベントを処理できるようにする
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
      setIsFocused(false);
      if (searchQuery.length >= 2) {
        addToHistory(searchQuery);
      }
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setIsFocused(false);
    }
  };

  return (
    <>
      <div className="max-w-xl mx-auto relative">
        <ProgressiveTooltip
          id="search"
          title="グッズを検索しよう"
          description="作品名やキャラクター名で検索できます。キーワードを入力してみましょう！"
          position="bottom"
        >
          <SearchInput
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
          />
        </ProgressiveTooltip>

        {/* 検索履歴 */}
        <SearchHistory
          history={history}
          onHistoryClick={handleHistoryClick}
          onRemove={removeFromHistory}
          onClearAll={clearHistory}
          visible={showHistory}
        />

        {/* 検索サジェスト */}
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
          onClose={() => {
            setIsItemDetailsOpen(false);
            setSelectedItemId(null);
          }}
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
}
