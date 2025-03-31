
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { getItemsGroupedByTag } from "@/utils/tag/tag-groups";
import { CollectionGrid } from "./CollectionGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { DragEndEvent } from "@dnd-kit/core";
import { Folder, MoreVertical, Plus, Search, ChevronLeft, PenLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

interface TagGroupedCollectionProps {
  userId: string;
}

export function TagGroupedCollection({ userId }: TagGroupedCollectionProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: itemsByTag = {}, isLoading } = useQuery({
    queryKey: ["items-by-tag", userId],
    queryFn: async () => {
      return getItemsGroupedByTag(userId);
    },
    enabled: !!userId,
  });

  // タグのリストを取得
  const tagNames = Object.keys(itemsByTag).sort();
  
  // 初回レンダリング時に最初のタグをアクティブにする
  useEffect(() => {
    if (tagNames.length > 0 && !activeTag) {
      setActiveTag(tagNames[0]);
    }
  }, [tagNames, activeTag]);

  const handleDragEnd = (event: DragEndEvent) => {
    // ドラッグ&ドロップの実装はここに入れることができます
    // 現在は何もしません
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (Object.keys(itemsByTag).length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">コレクションに追加されたアイテムがありません。</p>
      </div>
    );
  }

  // タグが選択されていない場合は、すべてのグループを表示
  if (!activeTag) {
    const filteredTags = tagNames.filter(tag => 
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="コレクションを検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50 border-gray-200"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>

        <div className="flex space-x-2 overflow-x-auto py-2">
          <Button variant="outline" className="flex items-center gap-2 whitespace-nowrap">
            <Folder className="h-4 w-4" />
            グループ
          </Button>
          <Button variant="outline" className="flex items-center gap-2 whitespace-nowrap">
            すべてのアイテム
          </Button>
        </div>

        <h2 className="text-lg font-bold mt-4">マイグループ</h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredTags.map((tagName) => (
            <div 
              key={tagName} 
              className="bg-blue-100 rounded-xl p-4 cursor-pointer relative"
              style={{ backgroundColor: getRandomPastelColor() }}
              onClick={() => setActiveTag(tagName)}
            >
              <div className="absolute top-2 right-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
              
              <Folder className="h-6 w-6 text-gray-600 mb-2" />
              
              <h3 className="font-semibold text-gray-800">{tagName}</h3>
              <p className="text-sm text-gray-600">{itemsByTag[tagName].length}アイテム</p>
            </div>
          ))}
          
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 cursor-pointer">
            <Plus className="h-6 w-6 mb-2" />
            <span className="text-sm">新規グループ</span>
          </div>
        </div>
      </div>
    );
  }

  // 特定のタグを選択した場合の表示
  return (
    <div className="space-y-4">
      <div className="bg-pink-100 py-2 px-4 rounded-md flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2"
            onClick={() => setActiveTag(null)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-medium">{activeTag}</h2>
        </div>
        <Button variant="ghost" size="icon">
          <PenLine className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative">
        <Input
          type="text"
          placeholder="グループ内を検索"
          className="pl-9 bg-gray-50 border-gray-200"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{itemsByTag[activeTag].length}アイテム</p>
        <Button variant="outline" className="text-blue-500 bg-blue-50 border-blue-100 flex items-center gap-1">
          <Plus className="h-4 w-4" />
          アイテムを追加
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {itemsByTag[activeTag].map((item) => (
          <div key={item.id} className="rounded-lg overflow-hidden border border-gray-200">
            <div className="relative">
              <img 
                src={item.image} 
                alt={item.title} 
                className="w-full h-32 object-cover"
              />
              <div className="absolute top-2 right-2 bg-blue-700 text-white text-xs px-2 py-0.5 rounded">削除</div>
            </div>
            <div className="p-2">
              <h3 className="text-xs font-medium text-gray-900 truncate">{item.title}</h3>
              <div className="flex items-center mt-1">
                <span className="text-xs text-gray-500 flex items-center">♥ 0</span>
                <span className="text-xs text-gray-500 ml-2 flex items-center">💬 0</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2 text-xs h-7"
              >
                記録を追加
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ランダムなパステルカラーを生成
function getRandomPastelColor() {
  const colors = [
    '#ffcccc', // パステルピンク
    '#ccffcc', // パステルグリーン
    '#ccccff', // パステルパープル
    '#ffffcc', // パステルイエロー
    '#ffccff', // パステルマゼンタ
    '#ccffff', // パステルシアン
    '#cce6ff', // パステルブルー
    '#ffebcc', // パステルオレンジ
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
