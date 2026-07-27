
import React from 'react';
import { Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CategoryTagSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function CategoryTagSearch({ searchQuery, setSearchQuery }: CategoryTagSearchProps) {
  const { t } = useLanguage();

  return (
    <div className="px-2 py-2 bg-popover">
      <div className="flex items-center border rounded-md px-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          className="w-full p-2 bg-transparent focus:outline-none text-sm"
          placeholder={t("tagManage.search.placeholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </div>
  );
}
