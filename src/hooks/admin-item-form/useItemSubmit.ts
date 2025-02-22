
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

      // カテゴリータグの処理
      const categoryTags = [
        { name: characterTag, category: 'character' },
        { name: typeTag, category: 'type' },
        { name: seriesTag, category: 'series' }
      ].filter(tag => tag.name) as { name: string; category: string }[];

      // すべてのタグをマージ（カテゴリータグと選択されたタグ）
      // 重複を除去
      const allTags = Array.from(new Set([
        ...categoryTags.map(tag => JSON.stringify({ name: tag.name, category: tag.category })),
        ...selectedTags.map(tag => JSON.stringify({ name: tag, category: null }))
      ])).map(tagStr => JSON.parse(tagStr));

      // タグの処理
      if (allTags.length > 0) {
        for (const tag of allTags) {
          try {
            // 既存のタグを検索
            const { data: existingTag, error: tagError } = await supabase
              .from("tags")
              .select("id")
              .eq("name", tag.name)
              .maybeSingle();

            if (tagError) throw tagError;

            let tagId;
            if (existingTag) {
              tagId = existingTag.id;
            } else {
              // 新しいタグを作成
              const { data: newTag, error: createError } = await supabase
                .from("tags")
                .insert([{
                  name: tag.name,
                  category: tag.category
                }])
                .select()
                .single();

              if (createError) throw createError;
              tagId = newTag.id;
            }

            // アイテムとタグを関連付け（重複を防ぐため、upsertを使用）
            const { error: linkError } = await supabase
              .from("item_tags")
              .upsert([{
                official_item_id: itemData.id,
                tag_id: tagId,
              }], {
                onConflict: 'official_item_id,tag_id'
              });

            if (linkError) throw linkError;
          } catch (error: any) {
            // unique constraintエラー以外のエラーの場合のみスロー
            if (error.code !== '23505') {
              throw error;
            }
          }
        }
      }

      toast({
        title: "アイテムを追加しました",
        description: "公式グッズリストに新しいアイテムが追加されました。",
      });

      resetForm();
      queryClient.invalidateQueries({ queryKey: ["official-items"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
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
