import React, { useState } from 'react';
import { ImageSearchUpload } from './ImageSearchUpload';
import { ImageSearchResults } from './ImageSearchResults';
import { analyzeImageFile, ImageAnalysisResult, WebSearchResult } from '@/utils/image-search';
import { Loader2, ScanSearch } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { OfficialItem } from '@/types';

export function ImageSearch() {
  const [results, setResults] = useState<OfficialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState<Array<{ description: string; score: number }>>([]);
  const [imageCaption, setImageCaption] = useState('');
  const [webResults, setWebResults] = useState<WebSearchResult | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleImageUpload = async (file: File) => {
    try {
      setLoading(true);
      setResults([]);
      setLabels([]);
      setImageCaption('');
      setWebResults(undefined);

      // プレビュー画像を表示
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      const analysisResult: ImageAnalysisResult = await analyzeImageFile(file);
      
      setLabels(analysisResult.detection.labels || []);
      setImageCaption(analysisResult.detection.caption);
      setResults(analysisResult.items);
      setWebResults(analysisResult.webResults);
      
      const totalResults = (analysisResult.items?.length || 0) + 
        (analysisResult.webResults?.visuallySimilarImages?.length || 0);

      if (totalResults === 0) {
        toast({
          title: "検索結果",
          description: "類似アイテムが見つかりませんでした",
        });
      } else {
        toast({
          title: "検索完了",
          description: `${totalResults}件の関連結果が見つかりました`,
        });
      }
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      toast({
        title: "エラー",
        description: "画像の解析中にエラーが発生しました。しばらくしてから再度お試しください。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-4 space-y-5 max-w-2xl">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ScanSearch className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">画像でグッズ検索</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          カメラで撮影するか画像をアップロードして、類似したグッズを探しましょう
        </p>
      </div>

      <ImageSearchUpload onImageSelect={handleImageUpload} />

      {/* プレビュー画像 */}
      {previewUrl && (
        <div className="flex justify-center">
          <div className="relative w-48 h-48 rounded-xl overflow-hidden border border-border shadow-sm">
            <img
              src={previewUrl}
              alt="検索画像"
              className="w-full h-full object-cover"
            />
            {loading && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        </div>
      )}

      {loading && !previewUrl && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg text-foreground">画像を解析中...</span>
        </div>
      )}

      <ImageSearchResults 
        items={results}
        labels={labels}
        caption={imageCaption}
        webResults={webResults}
      />
    </div>
  );
}