
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
  contentId?: string | null;
  disabled?: boolean;
}

export function CategoryTagSelect({
  category,
  label,
  value,
  onChange,
  contentId,
  disabled = false,
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
    queryKey: ["tags-by-category", category, contentId],
    queryFn: async () => {
      let query = supabase
        .from("tags")
        .select("*")
        .eq("category", category)
        .eq("status", "approved"); // 承認済みのみ取得
      
      // キャラクターとシリーズの場合、コンテンツIDでフィルタリング
      if ((category === "character" || category === "series") && contentId) {
        query = query.eq("content_id", contentId);
      } else if (category === "type") {
        // タイプは全てのコンテンツで共通（content_idがnull）
        query = query.is("content_id", null);
      }
      
      const { data, error } = await query.order("usage_count", { ascending: false }).order("name");
      
      if (error) {
        console.error(`Error fetching tags for category ${category}:`, error);
        throw error;
      }
      
      return data || [];
    },
    staleTime: 60000,
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

  // 現在の値を正規化する（Select コンポーネント用にUUIDに変換）
  const normalizedValue = (() => {
    if (!value) {
      console.log(`[CategoryTagSelect] No value for ${category}, returning undefined`);
      return undefined;
    }
    
    const isUUID = value.length === 36 && value.includes('-');
    if (isUUID) {
      // 既にUUIDの場合はそのまま返す
      console.log(`[CategoryTagSelect] Value is already UUID for ${category}: ${value}`);
      return value;
    } else {
      // タグ名の場合はUUIDに変換
      const matchingTag = tags.find(tag => tag.name === value);
      const result = matchingTag?.id || undefined;
      console.log(`[CategoryTagSelect] Converting tag name "${value}" to UUID "${result}" for ${category}`);
      return result;
    }
  })();

  // 新しいタグの追加処理
  const handleAddNewTag = async (tagName: string) => {
    const trimmedName = tagName.trim();
    if (!trimmedName) return;

    try {
      console.log(`Adding new tag: "${trimmedName}" for category: "${category}"`);
      
      // UUIDでないことを確認
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedName);
      if (isUUID) {
        console.error(`Cannot add UUID as tag name: ${trimmedName}`);
        return;
      }
      
      // 既存のタグとの重複をチェック
      const existingTag = tags.find(
        (tag) => tag.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (existingTag) {
        console.log(`Tag "${trimmedName}" already exists, using existing tag`);
        onChange(existingTag.name);
        return;
      }

      // タグデータを準備（status='approved'で作成）
      const tagData: any = {
        name: trimmedName,
        category,
        status: 'approved'
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

      console.log(`Successfully added new tag:`, newTag);
      
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: ["tags-by-category", category, contentId] });
      
      // 新しいタグの名前を設定
      onChange(newTag.name);
    } catch (error) {
      console.error("Error adding new tag:", error);
    }
  };


  const handleValueChange = (selectedValue: string) => {
    console.log(`[CategoryTagSelect] Received value "${selectedValue}" for category "${category}"`);
    console.log(`[CategoryTagSelect] onChange function:`, !!onChange);
    
    // UUIDかどうか確認（36文字で-が含まれる）
    const isUUID = selectedValue.length === 36 && selectedValue.includes('-');
    
    if (isUUID) {
      // UUIDが来た場合は対応するタグ名を見つける
      const matchingTag = tags.find(tag => tag.id === selectedValue);
      if (matchingTag) {
        console.log(`[CategoryTagSelect] Converting UUID ${selectedValue} to tag name: ${matchingTag.name}`);
        console.log(`[CategoryTagSelect] Calling onChange with tag name: ${matchingTag.name}`);
        onChange(matchingTag.name);
      } else {
        console.warn(`[CategoryTagSelect] No tag found for UUID: ${selectedValue}`);
        onChange(null);
      }
    } else {
      // タグ名が直接来た場合はそのまま使用
      console.log(`[CategoryTagSelect] Using tag name directly: ${selectedValue}`);
      console.log(`[CategoryTagSelect] Calling onChange with tag name: ${selectedValue}`);
      onChange(selectedValue);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select 
          value={normalizedValue}
          onValueChange={(selectedValue) => {
            console.log(`[CategoryTagSelect] Select onValueChange triggered for ${category} with: ${selectedValue}`);
            handleValueChange(selectedValue);
          }}
          onOpenChange={(open) => {
            console.log(`[CategoryTagSelect] Select opened/closed for ${category}: ${open}`);
            if (open) {
              // セレクトが開かれたときに最新データを取得
              refetch();
              // 検索クエリをリセット
              setSearchQuery("");
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-full bg-white" disabled={disabled}>
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
          disabled={disabled}
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
