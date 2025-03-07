
import { supabase } from "@/integrations/supabase/client";

export interface ImageAnalysisResult {
  detection: {
    objects: {
      label: string;
      score: number;
      box: {
        xmin: number;
        ymin: number;
        xmax: number;
        ymax: number;
      };
    }[];
    caption: string;
  };
  items: any[];
}

/**
 * 画像URLを解析し、関連アイテムを取得する
 */
export const analyzeImageUrl = async (imageUrl: string): Promise<ImageAnalysisResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-image', {
      body: { imageUrl },
    });

    if (error) throw error;
    return data as ImageAnalysisResult;
  } catch (error) {
    console.error('画像解析エラー:', error);
    throw error;
  }
};

/**
 * 画像ファイルをBase64に変換する
 */
export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * 画像ファイルを解析し、関連アイテムを取得する
 */
export const analyzeImageFile = async (file: File): Promise<ImageAnalysisResult> => {
  try {
    const base64Image = await convertFileToBase64(file);
    return await analyzeImageUrl(base64Image);
  } catch (error) {
    console.error('画像ファイル解析エラー:', error);
    throw error;
  }
};
