
import React from 'react';
import { Search } from "lucide-react";

interface CategoryTagSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function CategoryTagSearch({ searchQuery, setSearchQuery }: CategoryTagSearchProps) {
  return (
    <div className="px-2 py-2 bg-white">
      <div className="flex items-center border rounded-md px-2">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          className="w-full p-2 bg-transparent focus:outline-none text-sm"
          placeholder="タグを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </div>
  );
}
