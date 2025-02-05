
import { useState } from "react";
import { ItemImageUpload } from "../item/ItemImageUpload";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImageSectionProps {
  imageFile: File | null;
  setImageFile: (file: File | null) => void;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
}

export function ImageSection({
  imageFile,
  setImageFile,
  previewUrl,
  setPreviewUrl,
}: ImageSectionProps) {
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
      const { data: { imageBlob }, error } = await supabase.functions.invoke('proxy-image', {
        body: { url: imageUrl }
      });

      if (error) throw error;

      const response = await fetch(`data:image/jpeg;base64,${imageBlob}`);
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
        description: "この画像は取得できません。別の画像を選択してください。",
        variant: "destructive",
      });
    }
  };

  return (
    <>
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

      <ItemImageUpload
        onImageChange={handleImageChange}
        previewUrl={previewUrl}
        setPreviewUrl={setPreviewUrl}
      />

      <Dialog open={showImageSelector} onOpenChange={setShowImageSelector}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>画像を選択</DialogTitle>
            <DialogDescription>
              スクレイピングされた画像から選択してください
            </DialogDescription>
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
    </>
  );
}
