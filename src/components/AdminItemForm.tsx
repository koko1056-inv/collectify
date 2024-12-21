import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TagInput } from "./TagInput";
import { ImageUpload } from "./ImageUpload";
import { MediaSelectionFields } from "./MediaSelectionFields";

export function AdminItemForm() {
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

  const handleImageChange = (file: File | null) => {
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>新規アイテムの追加</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageUpload
            onImageChange={handleImageChange}
            previewUrl={previewUrl}
          />
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              タイトル
            </label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              説明
            </label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
          <MediaSelectionFields
            formData={formData}
            customArtist={customArtist}
            customAnime={customAnime}
            onFormDataChange={(key, value) => setFormData({ ...formData, [key]: value })}
            onCustomArtistChange={setCustomArtist}
            onCustomAnimeChange={setCustomAnime}
          />
          <TagInput
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "追加中..." : "アイテムを追加"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}