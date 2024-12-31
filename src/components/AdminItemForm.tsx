import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagInput } from "./TagInput";
import { ImageUpload } from "./ImageUpload";
import { useAdminItemForm } from "@/hooks/useAdminItemForm";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

export function AdminItemForm() {
  const {
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
  } = useAdminItemForm();

  const [urlInput, setUrlInput] = useState("");
  const [isScrapingImages, setIsScrapingImages] = useState(false);
  const [scrapedImages, setScrapedImages] = useState<string[]>([]);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const { toast } = useToast();

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleScrapeImages = async () => {
    if (!urlInput) {
      toast({
        title: "エラー",
        description: "URLを入力してください。",
        variant: "destructive",
      });
      return;
    }

    setIsScrapingImages(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-images', {
        body: { url: urlInput }
      });

      if (error) throw error;

      const images = data.images;
      if (images.length === 0) {
        toast({
          title: "画像が見つかりませんでした",
          description: "指定されたURLから画像を取得できませんでした。",
          variant: "destructive",
        });
        return;
      }

      setScrapedImages(images);
      setShowImageSelector(true);
    } catch (error) {
      console.error('Error scraping images:', error);
      toast({
        title: "エラー",
        description: "画像の取得に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsScrapingImages(false);
    }
  };

  const handleSelectScrapedImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'scraped-image.jpg', { type: 'image/jpeg' });
      handleImageChange(file);
      setShowImageSelector(false);
      setUrlInput("");
      setScrapedImages([]);
    } catch (error) {
      console.error('Error selecting image:', error);
      toast({
        title: "エラー",
        description: "画像の選択に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>新規アイテムの追加</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium">
              URLから画像を取得
            </label>
            <div className="flex gap-2">
              <Input
                id="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="URLを入力してください"
                disabled={isScrapingImages}
              />
              <Button
                type="button"
                onClick={handleScrapeImages}
                disabled={isScrapingImages}
              >
                {isScrapingImages ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "取得"
                )}
              </Button>
            </div>
          </div>

          <ImageUpload
            onImageChange={handleImageChange}
            previewUrl={previewUrl}
            setPreviewUrl={setPreviewUrl}
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

          <TagInput
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "追加中..." : "アイテムを追加"}
          </Button>
        </form>

        <Dialog open={showImageSelector} onOpenChange={setShowImageSelector}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>画像を選択</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh]">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
                {scrapedImages.map((imageUrl, index) => (
                  <div
                    key={index}
                    className="aspect-square relative overflow-hidden rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleSelectScrapedImage(imageUrl)}
                  >
                    <img
                      src={imageUrl}
                      alt={`Scraped image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}