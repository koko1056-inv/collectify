import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddTagDialog } from "./AddTagDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SimpleTagSelectProps {
  category: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  contentId?: string | null; // コンテンツIDを追加（キャラクターとシリーズ用）
}

export function SimpleTagSelect({
  category,
  label,
  value,
  onChange,
  contentId,
}: SimpleTagSelectProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: tags = [] } = useQuery({
    queryKey: ["tags-by-category", category, contentId],
    queryFn: async () => {
      let query = supabase
        .from("tags")
        .select("*")
        .eq("category", category);
      
      // キャラクターとシリーズの場合、コンテンツIDでフィルタリング
      if ((category === "character" || category === "series") && contentId) {
        query = query.eq("content_id", contentId);
      } else if (category === "type") {
        // タイプは全てのコンテンツで共通（content_idがnull）
        query = query.is("content_id", null);
      }
      
      const { data, error } = await query.order("name");
      
      if (error) {
        console.error(`Error fetching tags for category ${category}:`, error);
        throw error;
      }
      
      return data || [];
    },
  });

  const handleValueChange = (selectedValue: string) => {
    console.log(`[SimpleTagSelect] Value changed for ${category}: ${selectedValue}`);
    
    if (selectedValue === "clear") {
      onChange(null);
      return;
    }
    
    // タグ名を取得
    const selectedTag = tags.find(tag => tag.id === selectedValue);
    if (selectedTag) {
      onChange(selectedTag.name);
    }
  };

  const handleAddNewTag = async (tagName: string) => {
    const trimmedName = tagName.trim();
    if (!trimmedName) return;

    try {
      // 既存のタグとの重複をチェック
      const existingTag = tags.find(
        (tag) => tag.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (existingTag) {
        onChange(existingTag.name);
        return;
      }

      // タグデータを準備
      const tagData: any = { 
        name: trimmedName, 
        category 
      };
      
      // キャラクターとシリーズの場合、content_idを設定
      if ((category === "character" || category === "series") && contentId) {
        tagData.content_id = contentId;
      }

      const { data: newTag, error } = await supabase
        .from("tags")
        .insert([tagData])
        .select()
        .single();

      if (error) {
        console.error("Error adding new tag:", error);
        throw error;
      }

      // すべての関連キャッシュを更新
      queryClient.invalidateQueries({ queryKey: ["tags-by-category", category, contentId] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags-with-count"] });
      queryClient.invalidateQueries({ queryKey: ["official-items"] });
      
      // 新しいタグを設定
      onChange(newTag.name);
    } catch (error) {
      console.error("Error adding new tag:", error);
    }
  };

  // 現在選択されているタグのIDを取得
  const selectedTagId = value ? tags.find(tag => tag.name === value)?.id : undefined;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select 
          value={selectedTagId || ""}
          onValueChange={handleValueChange}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder={value || "選択してください"} />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="clear">クリア</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
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
        contentId={contentId}
        onTagAdded={(tagName) => {
          handleAddNewTag(tagName);
          setIsDialogOpen(false);
        }}
      />
    </div>
  );
}