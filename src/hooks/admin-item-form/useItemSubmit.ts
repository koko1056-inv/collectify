
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

  const createOrGetTag = async (name: string, category: string | null = null) => {
    // 既存のタグを検索
    const { data: existingTag } = await supabase
      .from("tags")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (existingTag) {
      return existingTag.id;
    }

    // タグが存在しない場合は新規作成
    const { data: newTag, error: createError } = await supabase
      .from("tags")
      .insert([{ name, category }])
      .select()
      .single();

    if (createError) throw createError;
    return newTag.id;
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

      // カテゴリータグの処理
      const categoryTags = [
        { name: characterTag, category: 'character' },
        { name: typeTag, category: 'type' },
        { name: seriesTag, category: 'series' }
      ].filter(tag => tag.name) as { name: string; category: string }[];

      // カテゴリータグとselectedTagsを一意な配列にまとめる
      const uniqueTags = new Set([
        ...categoryTags.map(tag => tag.name),
        ...selectedTags
      ]);

      // 各タグを処理
      for (const tagName of uniqueTags) {
        try {
          // カテゴリータグかどうかを確認
          const categoryTag = categoryTags.find(ct => ct.name === tagName);
          const tagId = await createOrGetTag(tagName, categoryTag?.category || null);

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
