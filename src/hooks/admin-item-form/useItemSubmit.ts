
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
            created_by: user?.id, // ユーザーIDを保存
          },
        ])
        .select()
        .single();

      if (itemError) throw itemError;

      // タグの処理
      if (selectedTags.length > 0) {
        for (const tagName of selectedTags) {
          const { data: existingTag } = await supabase
            .from("tags")
            .select("id")
            .eq("name", tagName)
            .maybeSingle();

          if (existingTag) {
            await supabase
              .from("item_tags")
              .insert([{
                official_item_id: itemData.id,
                tag_id: existingTag.id,
              }]);
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
