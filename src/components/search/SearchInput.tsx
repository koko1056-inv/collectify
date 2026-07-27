
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SearchInputProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export function SearchInput({
  searchQuery,
  onSearchChange,
  onFocus,
  onBlur,
  onKeyDown,
  placeholder
}: SearchInputProps) {
  const { t } = useLanguage();

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder={placeholder ?? t("chrome.search.goodsPlaceholder")}
        value={searchQuery}
        onChange={onSearchChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="pl-10 pr-3 bg-background border-border focus:border-border focus:ring-border"
      />
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
        <Search className="h-5 w-5" />
      </div>
    </div>
  );
}
