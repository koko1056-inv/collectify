
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addTagToItem } from "@/utils/tag/tag-mutations";

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
    // タイトルのバリデーション
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

  const createOrGetTag = async (name: string, category: string | null = null, contentId: string | null = null) => {
    if (!name) return null;
    
    console.log(`Creating/getting tag: "${name}" with category: "${category}", contentId: "${contentId}"`);

    // 既存のタグを検索（character/seriesはcontent_idも考慮）
    let query = supabase
      .from("tags")
      .select("id, name, category, content_id")
      .eq("name", name)
      .eq("category", category);

    // character/seriesカテゴリの場合はcontent_idでフィルタリング
    if ((category === 'character' || category === 'series') && contentId) {
      query = query.eq("content_id", contentId);
    } else if (category === 'type') {
      // typeカテゴリはcontent_idがnullのもののみ
      query = query.is("content_id", null);
    }

    const { data: existingTag, error: searchError } = await query.maybeSingle();

    if (searchError) {
      console.error("Error searching for tag:", searchError);
      throw searchError;
    }

    if (existingTag) {
      console.log(`Found existing tag: ${JSON.stringify(existingTag)}`);
      return existingTag.id;
    }

    // タグが存在しない場合は新規作成
    console.log(`Creating new tag: "${name}" with category: "${category}", content_id: "${contentId}"`);
    
    // character/seriesはcontent_idを付与、typeはnull
    const insertData: any = { name, category };
    if ((category === 'character' || category === 'series') && contentId) {
      insertData.content_id = contentId;
    }
    
    const { data: newTag, error: createError } = await supabase
      .from("tags")
      .insert([insertData])
      .select()
      .single();

    if (createError) {
      console.error("Error creating tag:", createError);
      throw createError;
    }
    
    console.log(`Created new tag: ${JSON.stringify(newTag)}`);
    return newTag.id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const imageUrl = await uploadImage();

      // データベースに保存するデータから、不要なフィールドを除外
      const { characterTag, typeTag, seriesTag, ...dbFormData } = formData;

      console.log("Form data:", formData);

      // categoryフィールドはデータベースに存在しないため、削除
      const dataToInsert = {
        title: dbFormData.title,
        description: dbFormData.description || "",
        content_name: dbFormData.content_name || null,
        item_type: dbFormData.item_type || "official",
        image: imageUrl,
        price: "0",
        release_date: new Date().toISOString().split('T')[0],
        created_by: user?.id,
      };

      const { data: itemData, error: itemError } = await supabase
        .from("official_items")
        .insert([dataToInsert])
        .select()
        .single();

      if (itemError) throw itemError;

      console.log("Created item:", itemData);

      // content_nameからcontent_idを取得
      let contentId: string | null = null;
      if (formData.content_name) {
        const { data: contentData } = await supabase
          .from("content_names")
          .select("id")
          .eq("name", formData.content_name)
          .maybeSingle();
        
        contentId = contentData?.id || null;
        console.log(`Content ID for "${formData.content_name}": ${contentId}`);
      }

      // カテゴリータグの処理（必須3種類）
      const categoryTags = [
        { name: characterTag, category: 'character', needsContentId: true },
        { name: typeTag, category: 'type', needsContentId: false },
        { name: seriesTag, category: 'series', needsContentId: true }
      ];

      console.log("Processing category tags:", categoryTags);

      // カテゴリータグを先に処理（これらは必須）
      for (const tag of categoryTags) {
        try {
          if (!tag.name) {
            console.error(`Missing required category tag: ${tag.category}`);
            continue;
          }
          
          // character/seriesの場合はcontentIdを渡す
          const tagContentId = tag.needsContentId ? contentId : null;
          const tagId = await createOrGetTag(tag.name, tag.category, tagContentId);
          if (tagId) {
            await addTagToItem(itemData.id, tagId, false);
            console.log(`Added ${tag.category} tag: ${tag.name} (content_id: ${tagContentId})`);
          }
        } catch (error) {
          console.error(`Error processing category tag ${tag.name}:`, error);
        }
      }

      // 追加のタグを処理（任意）
      console.log("Processing additional tags:", selectedTags);
      for (const tagName of selectedTags) {
        try {
          if (!tagName) continue;
          const tagId = await createOrGetTag(tagName, null);
          if (tagId) {
            await addTagToItem(itemData.id, tagId, false);
            console.log(`Added additional tag: ${tagName}`);
          }
        } catch (error) {
          console.error(`Error processing tag ${tagName}:`, error);
        }
      }

      // グッズ追加ポイントを付与
      try {
        // ポイント残高を取得・更新
        const { data: userPoints } = await supabase
          .from("user_points")
          .select("total_points")
          .eq("user_id", user?.id)
          .single();
          
        const newTotal = (userPoints?.total_points || 0) + 5;
        
        // ポイント残高がない場合は新規作成
        if (!userPoints) {
          await supabase
            .from("user_points")
            .insert({ 
              user_id: user?.id,
              total_points: 5
            });
        } else {
          await supabase
            .from("user_points")
            .update({ total_points: newTotal })
            .eq("user_id", user?.id);
        }
        
        // ポイント履歴に記録
        await supabase
          .from("point_transactions")
          .insert({
            user_id: user?.id,
            points: 5,
            transaction_type: "item_add",
            description: "グッズ追加",
            reference_id: itemData.id
          });
          
        await queryClient.invalidateQueries({ queryKey: ["userPoints"] });
        await queryClient.invalidateQueries({ queryKey: ["pointTransactions"] });
      } catch (pointError) {
        console.error("ポイント付与エラー:", pointError);
      }

      toast({
        title: "アイテムを追加しました",
        description: "あなたのおかげでグッズリストが充実しました！5ポイント獲得！",
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
