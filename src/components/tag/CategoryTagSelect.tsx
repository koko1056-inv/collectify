
import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddTagDialog } from "./AddTagDialog";
import { TagSelectContent } from "./TagSelectContent";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

interface CategoryTagSelectProps {
  category: string;
  label: string;
  value: string | null;
  onChange: (value: string | null, tagId?: string | null) => void;
  contentId?: string | null;
  disabled?: boolean;
  /**
   * AIなどが推測した名前。まだ登録されていない場合に
   * 「この名前で追加する」ボタンを出す（押さなければ何も作らない）。
   */
  suggestedName?: string | null;
  /**
   * character / series を作るのに作品IDが必要だが、まだ作品が未登録のことがある。
   * その場合にここで作品を用意して、そのIDを返す。
   * 返り値が null なら作品に紐づかないタグになる。
   */
  resolveContentId?: () => Promise<string | null>;
}

export function CategoryTagSelect({
  category,
  label,
  value,
  onChange,
  contentId,
  disabled = false,
  suggestedName,
  resolveContentId,
}: CategoryTagSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useLanguage();

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

  /**
   * 「この名前で追加する」を出す条件。
   * - まだ何も選ばれていない
   * - 推測名がある
   * - その名前が（表記揺れを無視して）まだ登録されていない
   */
  const canOfferSuggestion = (() => {
    const name = suggestedName?.trim();
    if (!name || value) return false;
    const norm = (x: string) => x.trim().toLowerCase().replace(/[\s\u3000]/g, "");
    return !tags.some((tag) => tag.name && norm(tag.name) === norm(name));
  })();

  // プレースホルダーテキストを取得
  const getPlaceholderText = () => {
    if (value) {
      // UUIDかどうか確認
      const isUUID = value.length === 36 && value.includes('-');
      
      if (isUUID) {
        // UUIDの場合は対応するタグ名を探す
        const matchingTag = tags.find(tag => tag.id === value);
        return matchingTag?.name || t("tagManage.select.notFound");
      } else {
        // タグ名の場合はそのまま表示
        return value;
      }
    }
    return t("tagManage.common.selectPlaceholder");
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
      const tagData: Record<string, unknown> = {
        name: trimmedName,
        category,
        status: 'approved'
      };

      // キャラクターとシリーズは作品に紐づける。
      // 作品がまだ未登録なら、ここで用意してから紐づける
      // （紐づかないタグを作ると、どの作品のキャラクターか分からなくなる）。
      if (category === "character" || category === "series") {
        const linkedContentId = contentId ?? (await resolveContentId?.()) ?? null;
        if (linkedContentId) tagData.content_id = linkedContentId;
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

      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: ["tags-by-category", category, contentId] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });

      // 新しいタグの名前を設定。
      // 挿入結果が期待した形で返らなかった場合でも、
      // 入力した名前は分かっているのでそちらを使う（「undefined」と出さない）。
      onChange(newTag?.name ?? trimmedName, newTag?.id ?? null);
      toast.success(t("tagManage.select.tagCreated", { name: newTag?.name ?? trimmedName }));
    } catch (error) {
      // 失敗を黙って飲み込むと、押したのに何も起きないように見える
      console.error("Error adding new tag:", error);
      toast.error(t("tagManage.select.tagCreateFailed"));
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
        console.log(`[CategoryTagSelect] Calling onChange with tag name: ${matchingTag.name} and id: ${matchingTag.id}`);
        onChange(matchingTag.name, matchingTag.id);
      } else {
        console.warn(`[CategoryTagSelect] No tag found for UUID: ${selectedValue}`);
        onChange(null, null);
      }
    } else {
      // タグ名が直接来た場合は対応するIDも探す
      const matchingTag = tags.find(tag => tag.name === selectedValue);
      console.log(`[CategoryTagSelect] Using tag name directly: ${selectedValue}, id: ${matchingTag?.id}`);
      onChange(selectedValue, matchingTag?.id || null);
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
          <SelectTrigger className="w-full bg-background" disabled={disabled}>
            <SelectValue placeholder={getPlaceholderText()} />
          </SelectTrigger>
          <SelectContent className="bg-popover w-full max-h-60 overflow-hidden" side="bottom">
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

      {/* AIが名前を当てているのに、その名前がまだ登録されていない場合。
          押したときだけ作る（勝手に作ると誤った推測がタグ一覧に溜まる）。 */}
      {canOfferSuggestion && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full justify-start gap-1.5 border-dashed text-xs"
          disabled={disabled || isCreating}
          onClick={async () => {
            setIsCreating(true);
            try {
              await handleAddNewTag(suggestedName!);
            } finally {
              setIsCreating(false);
            }
          }}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
          {t("tagManage.select.addSuggested", { name: suggestedName as string })}
        </Button>
      )}

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
