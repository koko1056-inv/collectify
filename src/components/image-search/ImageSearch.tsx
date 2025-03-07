
import React, { useState } from 'react';
import { ImageSearchUpload } from './ImageSearchUpload';
import { ImageSearchResults } from './ImageSearchResults';
import { analyzeImageFile } from '@/utils/image-search';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { OfficialItem } from '@/types';

export function ImageSearch() {
  const [results, setResults] = useState<OfficialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<string[]>([]);
  const [imageCaption, setImageCaption] = useState<string>('');

  const handleImageUpload = async (file: File) => {
    try {
      setLoading(true);
      setResults([]);
      setDetectedObjects([]);
      setImageCaption('');

      const analysisResult = await analyzeImageFile(file);
      
      // 検出オブジェクトを設定
      const objects = analysisResult.detection.objects
        .sort((a: any, b: any) => b.score - a.score)
        .map((obj: any) => `${obj.label} (${Math.round(obj.score * 100)}%)`);
      
      setDetectedObjects(objects);
      setImageCaption(analysisResult.detection.caption);
      setResults(analysisResult.items);
      
      if (analysisResult.items.length === 0) {
        toast({
          title: "検索結果",
          description: "類似アイテムが見つかりませんでした",
        });
      } else {
        toast({
          title: "検索結果",
          description: `${analysisResult.items.length}件の関連アイテムが見つかりました`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      toast({
        title: "エラー",
        description: "画像の解析中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">画像検索</h1>
        <p className="text-gray-600">
          画像をアップロードして、類似したグッズを探しましょう
        </p>
      </div>

      <ImageSearchUpload onImageSelect={handleImageUpload} />

      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">画像を解析中...</span>
        </div>
      )}

      {detectedObjects.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">検出されたオブジェクト:</h3>
          <div className="flex flex-wrap gap-2">
            {detectedObjects.slice(0, 5).map((obj, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {obj}
              </span>
            ))}
          </div>
          {imageCaption && (
            <div className="mt-3">
              <h3 className="font-medium mb-1">画像の説明:</h3>
              <p className="text-gray-700 italic">"{imageCaption}"</p>
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">検索結果 ({results.length}件)</h2>
          <ImageSearchResults results={results} />
        </div>
      )}
    </div>
  );
}
