import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useAdminItemForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    artist: "",
    anime: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customArtist, setCustomArtist] = useState("");
  const [customAnime, setCustomAnime] = useState("");

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      artist: "",
      anime: "",
    });
    setImageFile(null);
    setPreviewUrl(null);
    setSelectedTags([]);
    setCustomArtist("");
    setCustomAnime("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
            artist: formData.artist === "custom" ? customArtist : formData.artist,
            anime: formData.anime === "custom" ? customAnime : formData.anime,
          },
        ])
        .select()
        .single();

      if (itemError) throw itemError;

      // Process tags
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
    customArtist,
    setCustomArtist,
    customAnime,
    setCustomAnime,
    loading,
    handleSubmit,
  };
}