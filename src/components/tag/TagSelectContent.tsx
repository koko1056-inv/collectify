
import React from 'react';
import { SelectItem } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CategoryTagSearch } from "./CategoryTagSearch";
import type { Tag } from "@/types/tag";

interface TagSelectContentProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredTags: Tag[];
}

export function TagSelectContent({ searchQuery, setSearchQuery, filteredTags }: TagSelectContentProps) {
  // デバッグログを追加
  console.log('TagSelectContent - searchQuery:', searchQuery);
  console.log('TagSelectContent - filteredTags:', filteredTags);
  
  return (
    <>
      <CategoryTagSearch 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
      />
      <ScrollArea className="max-h-[200px] overflow-y-auto">
        {filteredTags.length > 0 ? (
          filteredTags.map((tag) => {
            console.log('TagSelectContent - rendering tag:', tag);
            console.log('TagSelectContent - tag.name:', tag.name);
            console.log('TagSelectContent - tag.id:', tag.id);
            
            return (
              <SelectItem 
                key={tag.id} 
                value={tag.name}
                className="cursor-pointer hover:bg-gray-100"
              >
                {tag.name}
              </SelectItem>
            );
          })
        ) : (
          <div className="p-2 text-sm text-gray-500 text-center">
            {searchQuery.trim() !== '' ? '該当するタグはありません' : 'タグがありません'}
          </div>
        )}
      </ScrollArea>
    </>
  );
}
