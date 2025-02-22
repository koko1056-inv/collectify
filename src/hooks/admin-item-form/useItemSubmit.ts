
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FormDataType {
  title: string;
  description: string;
  content_name?: string | null;
  item_type?: string;
  characterTag?: string | null;
  typeTag?: string | null;
  seriesTag?: string | null;
}

interface UseItemSubmitProps {
  formData: FormDataType;
  uploadImage: () => Promise<string>;
  selectedTags: string[];
  resetForm: () => void;
}

export function useItemSubmit({
  formData,
  uploadImage,
  selectedTags,
  resetForm,
}: UseItemSubmitProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast({
        title: "エラー",
        description: "タイトルを入力してください。",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const imageUrl = await uploadImage();

      // データベースに保存するデータから、タグ関連のフィールドを除外
      const { characterTag, typeTag, seriesTag, ...dbFormData } = formData;

      const { data: itemData, error: itemError } = await supabase
        .from("official_items")
        .insert([
          {
            ...dbFormData,
            image: imageUrl,
            price: "0",
            release_date: new Date().toISOString(),
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (itemError) throw itemError;

      // 重複を除去しつつ、各タグとそのカテゴリーを準備
      const allTags = new Map<string, { name: string; category: string | null }>();

      // カテゴリータグの追加
      if (characterTag) allTags.set(characterTag, { name: characterTag, category: 'character' });
      if (typeTag) allTags.set(typeTag, { name: typeTag, category: 'type' });
      if (seriesTag) allTags.set(seriesTag, { name: seriesTag, category: 'series' });

      // 選択されたタグの追加（カテゴリータグとの重複を避ける）
      selectedTags.forEach(tag => {
        if (!allTags.has(tag)) {
          allTags.set(tag, { name: tag, category: null });
        }
      });

      // タグの処理
      for (const [_, tagData] of allTags) {
        try {
          // 既存のタグを検索
          const { data: existingTag } = await supabase
            .from("tags")
            .select("id")
            .eq("name", tagData.name)
            .eq("category", tagData.category)
            .maybeSingle();

          let tagId;
          if (existingTag) {
            tagId = existingTag.id;
          } else {
            // 新しいタグを作成
            const { data: newTag, error: createError } = await supabase
              .from("tags")
              .insert([{
                name: tagData.name,
                category: tagData.category
              }])
              .select()
              .single();

            if (createError) throw createError;
            tagId = newTag.id;
          }

          // アイテムとタグを関連付け
          await supabase
            .from("item_tags")
            .upsert([{
              official_item_id: itemData.id,
              tag_id: tagId,
            }], {
              onConflict: 'official_item_id,tag_id'
            });
        } catch (error: any) {
          console.error("Error processing tag:", error);
          if (error.code !== '23505') { // 重複エラー以外はスロー
            throw error;
          }
        }
      }

      toast({
        title: "アイテムを追加しました",
        description: "公式グッズリストに新しいアイテムが追加されました。",
      });

      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["official-items"] });
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
      await queryClient.invalidateQueries({ queryKey: ["item-tags-count"] });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "エラー",
        description: "アイテムの追加に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleSubmit,
  };
}
