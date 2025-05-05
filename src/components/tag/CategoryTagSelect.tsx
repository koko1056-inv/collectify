
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
      return selectedTag?.name || value;
    }
    return "選択してください";
  };

  // 新しいタグの追加処理
  const handleAddNewTag = async (tagName: string) => {
    if (!tagName.trim()) return;

    try {
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
        .insert([{ name: tagName, category }])
        .select()
        .single();

      if (error) throw error;

      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: ["tags-by-category", category] });
      
      console.log(`Added new tag: ${tagName} with ID: ${newTag.id}`);
      onChange(tagName);
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

  const handleValueChange = (tagName: string) => {
    console.log(`CategoryTagSelect: Changed to "${tagName}" for category "${category}"`);
    onChange(tagName);
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
