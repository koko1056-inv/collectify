import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TagInput } from "./TagInput";
import { ImageUpload } from "./ImageUpload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

      // Insert the item first
      const { data: itemData, error: itemError } = await supabase
        .from("official_items")
        .insert([
          {
            ...formData,
            image: imageUrl,
            price: "0", // ダミー値として設定
            release_date: new Date().toISOString(), // ダミー値として設定
            artist: formData.artist === "custom" ? customArtist : formData.artist,
            anime: formData.anime === "custom" ? customAnime : formData.anime,
          },
        ])
        .select()
        .single();

      if (itemError) throw itemError;

      // Process tags
      for (const tagName of selectedTags) {
        // Check if tag exists using maybeSingle()
        const { data: existingTag, error: tagError } = await supabase
          .from("tags")
          .select("id")
          .eq("name", tagName)
          .maybeSingle();

        if (tagError) throw tagError;

        let tagId;
        if (!existingTag) {
          // Tag doesn't exist, create it
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

        // Create item-tag relationship
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
          <div className="space-y-2">
            <label htmlFor="artist" className="text-sm font-medium">
              アーティスト
            </label>
            <Select
              value={formData.artist}
              onValueChange={(value) => setFormData({ ...formData, artist: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="アーティストを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">その他（カスタム）</SelectItem>
                <SelectItem value="YOASOBI">YOASOBI</SelectItem>
                <SelectItem value="Mrs. GREEN APPLE">Mrs. GREEN APPLE</SelectItem>
                <SelectItem value="Official髭男dism">Official髭男dism</SelectItem>
                <SelectItem value="King Gnu">King Gnu</SelectItem>
                <SelectItem value="Ado">Ado</SelectItem>
              </SelectContent>
            </Select>
            {formData.artist === "custom" && (
              <Input
                placeholder="アーティスト名を入力"
                value={customArtist}
                onChange={(e) => setCustomArtist(e.target.value)}
                className="mt-2"
              />
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="anime" className="text-sm font-medium">
              アニメ
            </label>
            <Select
              value={formData.anime}
              onValueChange={(value) => setFormData({ ...formData, anime: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="アニメを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">その他（カスタム）</SelectItem>
                <SelectItem value="鬼滅の刃">鬼滅の刃</SelectItem>
                <SelectItem value="呪術廻戦">呪術廻戦</SelectItem>
                <SelectItem value="SPY×FAMILY">SPY×FAMILY</SelectItem>
                <SelectItem value="チェンソーマン">チェンソーマン</SelectItem>
                <SelectItem value="推しの子">推しの子</SelectItem>
              </SelectContent>
            </Select>
            {formData.anime === "custom" && (
              <Input
                placeholder="アニメ名を入力"
                value={customAnime}
                onChange={(e) => setCustomAnime(e.target.value)}
                className="mt-2"
              />
            )}
          </div>
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