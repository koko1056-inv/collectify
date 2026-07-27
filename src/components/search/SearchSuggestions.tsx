
import { Search, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  showSuggestions: boolean;
  onSuggestionClick: (suggestion: SearchSuggestion) => void;
  isLoading?: boolean;
  error?: any;
}

export function SearchSuggestions({
  suggestions,
  showSuggestions,
  onSuggestionClick,
  isLoading = false,
  error = null
}: SearchSuggestionsProps) {
  const { t } = useLanguage();

  if (!showSuggestions) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
      {isLoading && (
        <div className="px-4 py-4 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">{t("chrome.search.searching")}</span>
        </div>
      )}
      
      {error && (
        <div className="px-4 py-2 text-sm text-red-500">
          {t("chrome.search.searchError")}
        </div>
      )}
      
      {!isLoading && !error && suggestions.length === 0 && (
        <div className="px-4 py-2 text-sm text-gray-500">
          {t("chrome.search.noMatchingItems")}
        </div>
      )}
      
      {!isLoading && !error && suggestions.length > 0 && suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.type}-${suggestion.id}-${index}`}
          className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
          onClick={() => onSuggestionClick(suggestion)}
        >
          <Search className="h-4 w-4 text-gray-400" />
          <div className="flex-1">
            <span className="text-sm text-gray-700">{suggestion.title}</span>
            {suggestion.content_name && (
              <div className="text-xs text-gray-400">{suggestion.content_name}</div>
            )}
          </div>
          <span className="text-xs text-gray-400">
            {suggestion.type === 'item' ? t("chrome.search.typeGoods") : t("chrome.search.typeContent")}
          </span>
        </div>
      ))}
    </div>
  );
}
