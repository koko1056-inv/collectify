
import React from 'react';
import { OfficialGoodsCard } from '@/components/OfficialGoodsCard';

type OfficialItem = {
  id: string;
  title: string;
  image: string;
  artist?: string;
  anime?: string;
  price?: number;
  release_date?: string;
  description?: string;
  content_name?: string;
};

interface ImageSearchResultsProps {
  results: OfficialItem[];
}

export function ImageSearchResults({ results }: ImageSearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">検索結果がありません</p>
        <p className="text-sm text-gray-400 mt-2">別の画像で試してみてください</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {results.map((item) => (
        <OfficialGoodsCard 
          key={item.id}
          id={item.id}
          title={item.title}
          image={item.image}
          artist={item.artist}
          anime={item.anime}
          price={item.price}
          releaseDate={item.release_date}
          description={item.description}
          contentName={item.content_name}
        />
      ))}
    </div>
  );
}
