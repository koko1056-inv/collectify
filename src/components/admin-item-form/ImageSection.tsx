
import { useState } from "react";
import { ItemImageUpload } from "../item/ItemImageUpload";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
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

export interface AnalysisResult {
  title: string;
  description: string;
  price: string;
  category: string;
  contentName: string;
  characterName: string;
  selectedImages?: Array<{
    url: string;
    title: string | null;
  }>;
}

interface ImageSectionProps {
  imageFile: File | null;
  setImageFile: (file: File | null) => void;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

export function ImageSection({
  imageFile,
  setImageFile,
  previewUrl,
  setPreviewUrl,
  onAnalysisComplete,
}: ImageSectionProps) {
  const [urlInput, setUrlInput] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isScrapingImages, setIsScrapingImages] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scrapedImages, setScrapedImages] = useState<Array<{
    url: string;
    title: string | null;
  }>>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [showImageSelector, setShowImageSelector] = useState(false);
  const { toast } = useToast();

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!previewUrl) {
      toast({
        title: "エラー",
        description: "画像を選択してください。",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // 画像URLをbase64に変換して送信
      let imageUrl = previewUrl;
      
      // ローカルのBlobURLの場合はbase64に変換
      if (previewUrl.startsWith('blob:')) {
        const response = await fetch(previewUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        
        imageUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      // URLの情報も送信（元のページURLがある場合）
      const requestBody: any = { imageUrl };
      if (imageUrlInput || urlInput) {
        requestBody.sourceUrl = imageUrlInput || urlInput;
      }

      const { data, error } = await supabase.functions.invoke('analyze-item-image', {
        body: requestBody
      });

      if (error) throw error;

      if (data && onAnalysisComplete) {
        onAnalysisComplete(data);
        toast({
          title: "分析完了",
          description: "AIが画像とURLを分析してフォームに自動入力しました。",
        });
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: "エラー",
        description: "画像の分析に失敗しました。もう一度お試しください。",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
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

  const toggleImageSelection = (imageUrl: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageUrl)) {
        newSet.delete(imageUrl);
      } else {
        if (newSet.size >= 10) {
          toast({
            title: "選択上限",
            description: "最大10件まで選択できます。",
            variant: "destructive",
          });
          return prev;
        }
        newSet.add(imageUrl);
      }
      return newSet;
    });
  };

  const handleConfirmSelection = () => {
    if (selectedImages.size === 0) {
      toast({
        title: "エラー",
        description: "少なくとも1つの画像を選択してください。",
        variant: "destructive",
      });
      return;
    }

    const selectedImagesData = scrapedImages.filter(img => selectedImages.has(img.url));
    
    // 親コンポーネントに選択した画像を渡す
    if (onAnalysisComplete) {
      onAnalysisComplete({
        title: "",
        description: "",
        price: "",
        category: "",
        contentName: "",
        characterName: "",
        selectedImages: selectedImagesData
      });
    }
    
    toast({
      title: "画像を選択しました",
      description: `${selectedImages.size}件の画像を選択しました。`,
    });
    
    setShowImageSelector(false);
    setUrlInput("");
    setScrapedImages([]);
    setSelectedImages(new Set());
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
        <div className="bg-gray-50 p-2 sm:p-4 rounded-lg border">
          <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-gray-900">画像の追加方法</h3>
          
          <div className="space-y-4 sm:space-y-6">
            {/* 方法1 */}
            <div className="bg-white p-3 sm:p-4 rounded-lg border-2 border-gray-200">
              <div className="flex items-start gap-2 sm:gap-3 mb-3">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <label htmlFor="imageUrl" className="text-sm sm:text-base font-semibold text-gray-900 block mb-1">
                    画像URLを直接設定
                  </label>
                  <p className="text-xs sm:text-sm text-gray-600 break-words">
                    画像の直接URLがある場合はこちらを使用してください
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:ml-11">
                <Input
                  id="imageUrl"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://exar..."
                  className="text-sm"
                />
                <Button
                  type="button"
                  onClick={handleSetImageUrl}
                  className="sm:flex-shrink-0 text-sm px-4"
                >
                  設定
                </Button>
              </div>
            </div>

            {/* 方法2 */}
            <div className="bg-white p-3 sm:p-4 rounded-lg border-2 border-gray-200">
              <div className="flex items-start gap-2 sm:gap-3 mb-3">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                  B
                </div>
                <div className="flex-1 min-w-0">
                  <label htmlFor="fileUpload" className="text-sm sm:text-base font-semibold text-gray-900 block mb-1">
                    ファイルから画像をアップロード
                  </label>
                  <p className="text-xs sm:text-sm text-gray-600 break-words">
                    お手持ちの画像ファイルを選択してアップロードできます
                  </p>
                </div>
              </div>
              <div className="sm:ml-11">
                <Input
                  id="fileUpload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageChange(e.target.files[0]);
                    }
                  }}
                  className="file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:rounded-md file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer text-sm"
                />
              </div>
            </div>

            {/* 方法3 */}
            <div className="bg-white p-3 sm:p-4 rounded-lg border-2 border-gray-200">
              <div className="flex items-start gap-2 sm:gap-3 mb-3">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                  C
                </div>
                <div className="flex-1 min-w-0">
                  <label htmlFor="url" className="text-sm sm:text-base font-semibold text-gray-900 block mb-1">
                    Webサイトから画像を取得
                  </label>
                  <p className="text-xs sm:text-sm text-gray-600 break-words">
                    商品ページのURLを入力すると、そのページから画像を自動取得します。複数選択して一括登録できます。
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:ml-11">
                <Input
                  id="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://exar..."
                  disabled={isScrapingImages}
                  className="text-sm"
                />
                <Button
                  type="button"
                  onClick={handleScrapeImages}
                  disabled={isScrapingImages}
                  className="sm:flex-shrink-0 text-sm px-4"
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg text-gray-900">画像プレビュー</h3>
              <Button
                type="button"
                onClick={handleAnalyzeImage}
                disabled={isAnalyzing}
                variant="default"
                size="sm"
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    ✨ AIで自動記入
                  </>
                )}
              </Button>
            </div>
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>グッズを選択</DialogTitle>
            <DialogDescription>
              最大10件の画像を選択できます (選択中: {selectedImages.size}/10)
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[65vh]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
              {scrapedImages.map((imageData, index) => {
                const isSelected = selectedImages.has(imageData.url);
                return (
                  <div
                    key={index}
                    className="relative overflow-hidden rounded-lg border-2 cursor-pointer transition-all bg-white"
                    style={{
                      borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
                      transform: isSelected ? 'scale(0.98)' : 'scale(1)',
                    }}
                    onClick={() => toggleImageSelection(imageData.url)}
                  >
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={imageData.url}
                        alt={imageData.title || `Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* 選択インジケーター */}
                      <div className="absolute bottom-2 right-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-blue-500 text-white'
                              : 'bg-white/80 text-gray-400 border-2 border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                    {imageData.title && (
                      <div className="p-2">
                        <p className="text-xs font-medium line-clamp-2 text-gray-900">
                          {imageData.title}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowImageSelector(false);
                setSelectedImages(new Set());
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleConfirmSelection}
              disabled={selectedImages.size === 0}
            >
              {selectedImages.size}件を選択
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
