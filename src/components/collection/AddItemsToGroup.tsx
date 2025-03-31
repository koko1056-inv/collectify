
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AddItemsToGroupProps {
  userId: string;
  tagId: string;
  tagName: string;
  onClose: () => void;
}

export function AddItemsToGroup({ userId, tagId, tagName, onClose }: AddItemsToGroupProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const navigate = useNavigate();
  
  // ユーザーのコレクションアイテムを取得
  const { data: userItems = [], isLoading } = useQuery({
    queryKey: ["user-items-for-group", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_items")
        .select(`
          id,
          title,
          image,
          type
        `)
        .eq("user_id", userId);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
  
  // タグ付けされていないアイテムを取得
  const { data: itemsWithTag = [] } = useQuery({
    queryKey: ["items-with-tag", userId, tagId],
    queryFn: async () => {
      if (!userId || !tagId) return [];
      
      const { data, error } = await supabase
        .from("user_item_tags")
        .select("user_item_id")
        .eq("tag_id", tagId);
        
      if (error) throw error;
      return data?.map(item => item.user_item_id) || [];
    },
    enabled: !!userId && !!tagId,
  });
  
  // 検索条件に一致するアイテムをフィルタリング
  const filteredItems = userItems.filter(item => {
    // すでにタグ付けされているアイテムを除外
    if (itemsWithTag.includes(item.id)) return false;
    
    // 検索クエリに一致するアイテムをフィルタリング
    if (searchQuery && !item.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });
  
  // アイテムを選択
  const handleSelectItem = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };
  
  // 選択したアイテムをグループに追加
  const handleAddItems = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      const items = selectedItems.map(itemId => ({
        user_item_id: itemId,
        tag_id: tagId,
        created_at: new Date().toISOString(),
      }));
      
      const { error } = await supabase
        .from("user_item_tags")
        .insert(items);
        
      if (error) throw error;
      
      // 成功したら閉じる
      onClose();
    } catch (error) {
      console.error("Error adding items to group:", error);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* ヘッダー */}
      <div className="bg-pink-200 py-3 px-4 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mr-2"
          onClick={onClose}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-md font-medium">{tagName}にアイテムを追加</h1>
      </div>
      
      {/* 検索バー */}
      <div className="p-4">
        <div className="relative mb-4">
          <Input
            type="text"
            placeholder="アイテムを検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50 border-gray-200"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          グループに追加するアイテムを選択してください
        </p>
        
        {/* アイテムリスト */}
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="flex items-center bg-white p-2 rounded-lg border border-gray-200"
              onClick={() => handleSelectItem(item.id)}
            >
              <div className="relative mr-3">
                {selectedItems.includes(item.id) && (
                  <div className="absolute -top-1 -left-1 bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-16 h-16 object-cover rounded"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.type}</p>
              </div>
            </div>
          ))}
          
          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">追加できるアイテムがありません</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 追加ボタン */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <Button
          className="w-full bg-blue-500 hover:bg-blue-600"
          disabled={selectedItems.length === 0}
          onClick={handleAddItems}
        >
          {selectedItems.length}アイテムを追加
        </Button>
      </div>
    </div>
  );
}
