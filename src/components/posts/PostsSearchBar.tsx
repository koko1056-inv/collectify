
import { SearchInput } from "@/components/search/SearchInput";
import { useLanguage } from "@/contexts/LanguageContext";

interface PostsSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function PostsSearchBar({
  searchQuery,
  onSearchChange,
}: PostsSearchBarProps) {
  const { t } = useLanguage();

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
        placeholder={t("social.posts.searchPlaceholder")}
      />
    </div>
  );
}
