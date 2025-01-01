import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { useEffect } from "react";

export function useAdminItemForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const debouncedTitle = useDebounce(formData.title, 500);

  useEffect(() => {
    const checkDuplicateTitle = async () => {
      if (!debouncedTitle.trim()) return;
      
      const { data } = await supabase
        .from("official_items")
        .select("id")
        .eq("title", debouncedTitle)
        .maybeSingle();
      
      if (data) {
        toast({
          title: "警告",
          description: "同じタイトルのアイテムが既に存在します。",
          variant: "destructive",
        });
      }
    };

    checkDuplicateTitle();
  }, [debouncedTitle, toast]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
    });
    setImageFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedTags([]);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast({
        title: "エラー",
        description: "タイトルを入力してください。",
        variant: "destructive",
      });
      return false;
    }

    if (!imageFile) {
      toast({
        title: "エラー",
        description: "画像を選択してください。",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const checkDuplicateTitle = async (title: string) => {
    const { data } = await supabase
      .from("official_items")
      .select("id")
      .eq("title", title)
      .maybeSingle();
    
    return !!data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Check for duplicate title
      const isDuplicate = await checkDuplicateTitle(formData.title);
      if (isDuplicate) {
        toast({
          title: "エラー",
          description: "同じタイトルのアイテムが既に存在します。",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      let imageUrl = "";
      
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('kuji_images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('kuji_images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const { data: itemData, error: itemError } = await supabase
        .from("official_items")
        .insert([
          {
            ...formData,
            image: imageUrl,
            price: "0",
            release_date: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (itemError) throw itemError;

      // Process tags
      if (selectedTags.length > 0) {
        for (const tagName of selectedTags) {
          const { data: existingTag, error: tagError } = await supabase
            .from("tags")
            .select("id")
            .eq("name", tagName)
            .maybeSingle();

          if (tagError) throw tagError;

          let tagId;
          if (!existingTag) {
            const { data: newTag, error: createTagError } = await supabase
              .from("tags")
              .insert([{ name: tagName }])
              .select()
              .single();

            if (createTagError) throw createTagError;
            tagId = newTag.id;
          } else {
            tagId = existingTag.id;
          }

          const { error: relationError } = await supabase
            .from("item_tags")
            .insert([{
              official_item_id: itemData.id,
              tag_id: tagId,
            }]);

          if (relationError) throw relationError;
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
    formData,
    setFormData,
    imageFile,
    setImageFile,
    previewUrl,
    setPreviewUrl,
    selectedTags,
    setSelectedTags,
    loading,
    handleSubmit,
  };
}