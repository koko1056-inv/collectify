
import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddTagDialog } from "./AddTagDialog";
import { TagSelectContent } from "./TagSelectContent";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CategoryTagSelectProps {
  category: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}

export function CategoryTagSelect({
  category,
  label,
  value,
  onChange,
}: CategoryTagSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // valueがリセットされたときに内部状態をリセット
  useEffect(() => {
    if (!value) {
      setSearchQuery('');
      setIsDialogOpen(false);
    }
  }, [value]);

  const { data: tags = [], refetch } = useQuery({
    queryKey: ["tags-by-category", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("category", category)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    staleTime: 60000, // 1分間キャッシュを保持
  });

  // 検索クエリに基づいてタグをフィルタリング
  const filteredTags = tags.filter((tag) => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 現在選択されているタグを見つける
  const selectedTag = value ? tags.find(tag => tag.name === value) : null;

  // プレースホルダーテキストを取得
  const getPlaceholderText = () => {
    if (value) {
      // UUIDかどうか確認
      const isUUID = value.length === 36 && value.includes('-');
      
      if (isUUID) {
        // UUIDの場合は対応するタグ名を探す
        const matchingTag = tags.find(tag => tag.id === value);
        return matchingTag?.name || "タグが見つかりません";
      } else {
        // タグ名の場合はそのまま表示
        return value;
      }
    }
    return "選択してください";
  };

  // 新しいタグの追加処理
  const handleAddNewTag = async (tagName: string) => {
    if (!tagName.trim()) return;

    try {
      console.log(`Adding new tag: "${tagName}" for category: "${category}"`);
      
      // 既存のタグとの重複をチェック
      const existingTag = tags.find(
        (tag) => tag.name.toLowerCase() === tagName.toLowerCase()
      );

      if (existingTag) {
        console.log(`Tag "${tagName}" already exists, using existing tag`);
        onChange(existingTag.name);
        return;
      }

      const { data: newTag, error } = await supabase
        .from("tags")
        .insert([{ name: tagName.trim(), category }])
        .select()
        .single();

      if (error) {
        console.error("Error adding new tag:", error);
        throw error;
      }

      console.log(`Successfully added new tag:`, newTag);
      
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: ["tags-by-category", category] });
      
      // 新しいタグの名前を設定
      onChange(newTag.name);
    } catch (error) {
      console.error("Error adding new tag:", error);
    }
  };

  // デバッグ用ログ出力
  useEffect(() => {
    console.log(`CategoryTagSelect for ${category}: current value = ${value || 'null'}, tags count = ${tags.length}`);
    
    // valueがある場合、対応するタグがtagsに存在するか確認
    if (value) {
      const matchingTag = tags.find(tag => tag.name === value);
      console.log(`  Value "${value}" ${matchingTag ? 'matches' : 'does NOT match'} a tag in the list`);
      
      if (!matchingTag && tags.length > 0) {
        console.log(`  Available tags: ${tags.slice(0, 5).map(t => t.name).join(', ')}${tags.length > 5 ? '...' : ''}`);
      }
    }
  }, [category, value, tags]);

  const handleValueChange = (selectedValue: string) => {
    console.log(`CategoryTagSelect: Received value "${selectedValue}" for category "${category}"`);
    
    // UUIDかどうか確認（36文字で-が含まれる）
    const isUUID = selectedValue.length === 36 && selectedValue.includes('-');
    
    if (isUUID) {
      // UUIDが来た場合は対応するタグ名を見つける
      const matchingTag = tags.find(tag => tag.id === selectedValue);
      if (matchingTag) {
        console.log(`Converting UUID ${selectedValue} to tag name: ${matchingTag.name}`);
        onChange(matchingTag.name);
      } else {
        console.warn(`No tag found for UUID: ${selectedValue}`);
        onChange(null);
      }
    } else {
      // タグ名が直接来た場合はそのまま使用
      console.log(`Using tag name directly: ${selectedValue}`);
      onChange(selectedValue);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select 
          value={value || undefined}
          onValueChange={handleValueChange}
          onOpenChange={(open) => {
            if (open) {
              // セレクトが開かれたときに最新データを取得
              refetch();
              // 検索クエリをリセット
              setSearchQuery("");
            }
          }}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder={getPlaceholderText()} />
          </SelectTrigger>
          <SelectContent className="bg-white w-full max-h-60 overflow-hidden" side="bottom">
            <TagSelectContent 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filteredTags={filteredTags}
            />
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <AddTagDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        category={category}
        onTagAdded={(tagName) => {
          handleAddNewTag(tagName);
          setIsDialogOpen(false);
        }}
      />
    </div>
  );
}
