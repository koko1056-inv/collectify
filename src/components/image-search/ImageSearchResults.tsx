
import React from 'react';
import { OfficialGoodsCard } from '@/components/OfficialGoodsCard';
import { OfficialItem } from '@/types';

interface ImageSearchResultsProps {
  results: OfficialItem[];
}

export function ImageSearchResults({ results }: ImageSearchResultsProps) {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {results.map((item) => (
        <OfficialGoodsCard 
          key={item.id} 
          item={item} 
        />
      ))}
    </div>
  );
}
