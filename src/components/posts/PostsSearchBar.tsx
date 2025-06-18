
import { SearchInput } from "@/components/search/SearchInput";

interface PostsSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function PostsSearchBar({
  searchQuery,
  onSearchChange,
}: PostsSearchBarProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onSearchChange(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  return (
    <div className="max-w-xl mx-auto mb-6">
      <SearchInput
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onFocus={() => {}}
        onBlur={() => {}}
        onKeyDown={handleKeyDown}
        placeholder="投稿を検索..."
      />
    </div>
  );
}
