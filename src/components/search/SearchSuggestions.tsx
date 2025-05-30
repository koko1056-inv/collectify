
import { Search } from "lucide-react";

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
}

export function SearchSuggestions({
  suggestions,
  showSuggestions,
  onSuggestionClick
}: SearchSuggestionsProps) {
  if (!showSuggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.type}-${suggestion.id}-${index}`}
          className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
          onClick={() => onSuggestionClick(suggestion)}
        >
          <Search className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-700">{suggestion.title}</span>
          <span className="text-xs text-gray-400 ml-auto">
            {suggestion.type === 'item' ? 'グッズ' : 'コンテンツ'}
          </span>
        </div>
      ))}
    </div>
  );
}
