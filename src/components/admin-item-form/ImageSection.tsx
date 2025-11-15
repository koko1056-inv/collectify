
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
  const [imageUrlInput, setImageUrlInput] = useState("");
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

  const handleSetImageUrl = async () => {
    if (!imageUrlInput) {
      toast({
        title: "エラー",
        description: "画像URLを入力してください。",
        variant: "destructive",
      });
      return;
    }

    try {
      // URLが有効な画像かチェック
      const img = new Image();
      img.onload = async () => {
        try {
          // 画像URLから画像データを取得してFileオブジェクトに変換
          const response = await fetch(imageUrlInput);
          const blob = await response.blob();
          
          // ファイル名を生成
          const urlParts = imageUrlInput.split('/');
          const fileName = urlParts[urlParts.length - 1] || 'image.jpg';
          
          const file = new File([blob], fileName, { type: blob.type });
          handleImageChange(file);
          setImageUrlInput("");
          
          toast({
            title: "画像を設定しました",
            description: "画像URLから画像を取得しました。",
          });
        } catch (error) {
          console.error('Error fetching image:', error);
          toast({
            title: "エラー",
            description: "画像の取得に失敗しました。URLを確認してください。",
            variant: "destructive",
          });
        }
      };
      
      img.onerror = () => {
        toast({
          title: "エラー",
          description: "有効な画像URLではありません。",
          variant: "destructive",
        });
      };
      
      img.src = imageUrlInput;
    } catch (error) {
      console.error('Error setting image URL:', error);
      toast({
        title: "エラー",
        description: "画像の設定に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h3 className="font-semibold text-lg mb-4 text-gray-900">画像の追加方法</h3>
          
          <div className="space-y-6">
            {/* 方法1 */}
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  A
                </div>
                <div className="flex-1">
                  <label htmlFor="imageUrl" className="text-base font-semibold text-gray-900 block mb-1">
                    画像URLを直接設定
                  </label>
                  <p className="text-sm text-gray-600">
                    画像の直接URLがある場合はこちらを使用してください
                  </p>
                </div>
              </div>
              <div className="flex gap-2 ml-11">
                <Input
                  id="imageUrl"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <Button
                  type="button"
                  onClick={handleSetImageUrl}
                >
                  設定
                </Button>
              </div>
            </div>

            {/* 方法2 */}
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  B
                </div>
                <div className="flex-1">
                  <label htmlFor="fileUpload" className="text-base font-semibold text-gray-900 block mb-1">
                    ファイルから画像をアップロード
                  </label>
                  <p className="text-sm text-gray-600">
                    お手持ちの画像ファイルを選択してアップロードできます
                  </p>
                </div>
              </div>
              <div className="ml-11">
                <Input
                  id="fileUpload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageChange(e.target.files[0]);
                    }
                  }}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
            </div>

            {/* 方法3 */}
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  C
                </div>
                <div className="flex-1">
                  <label htmlFor="url" className="text-base font-semibold text-gray-900 block mb-1">
                    Webサイトから画像を取得
                  </label>
                  <p className="text-sm text-gray-600">
                    商品ページのURLを入力すると、そのページから画像を自動取得します
                  </p>
                </div>
              </div>
              <div className="flex gap-2 ml-11">
                <Input
                  id="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/product-page"
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
          </div>
        </div>

        {/* 画像プレビュー */}
        {previewUrl && (
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-semibold text-lg mb-3 text-gray-900">画像プレビュー</h3>
            <div className="relative max-w-md mx-auto">
              <img
                src={previewUrl}
                alt="選択された画像のプレビュー"
                className="w-full h-auto rounded-lg border object-cover max-h-64"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setImageFile(null);
                  setPreviewUrl(null);
                  setImageUrlInput("");
                }}
                className="absolute top-2 right-2 bg-white/90 hover:bg-white"
              >
                削除
              </Button>
            </div>
          </div>
        )}
      </div>

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
