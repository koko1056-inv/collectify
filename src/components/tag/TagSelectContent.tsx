
import React from 'react';
import { SelectItem } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import type { Tag } from "@/types/tag";

interface TagSelectContentProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredTags: Tag[];
}

export function TagSelectContent({ searchQuery, setSearchQuery, filteredTags }: TagSelectContentProps) {
  return (
    <>
      <div className="p-2">
        <Input
          placeholder="タグを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>
      
      <ScrollArea className="max-h-[200px] overflow-y-auto">
        {filteredTags.length > 0 ? (
          filteredTags.map((tag) => (
            <SelectItem 
              key={tag.id} 
              value={tag.id}
              className="cursor-pointer hover:bg-gray-100"
            >
              {tag.name}
            </SelectItem>
          ))
        ) : (
          <div className="p-2 text-sm text-gray-500 text-center">
            {searchQuery.trim() !== '' ? '該当するタグはありません' : 'タグがありません'}
          </div>
        )}
      </ScrollArea>
    </>
  );
}
