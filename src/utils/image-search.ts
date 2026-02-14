import { supabase } from "@/integrations/supabase/client";

/**
 * 画像をBase64エンコードする
 */
const convertImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      resolve(base64String);
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
};

export interface WebSearchResult {
  webEntities: Array<{ description: string; score: number }>;
  bestGuessLabels: string[];
  visuallySimilarImages: Array<{ url: string; score?: number }>;
  pagesWithMatchingImages: Array<{
    url: string;
    pageTitle?: string;
    fullMatchingImages?: Array<{ url: string }>;
    partialMatchingImages?: Array<{ url: string }>;
  }>;
}

export interface ImageAnalysisResult {
  detection: {
    objects: Array<{ label: string; score: number }>;
    labels: Array<{ description: string; score: number }>;
    caption: string;
    detectedTexts: string[];
  };
  webResults: WebSearchResult;
  keywords: string[];
  items: any[];
}

/**
 * 画像ファイルを解析してSupabase Edge Functionを呼び出す
 */
export const analyzeImageFile = async (file: File): Promise<ImageAnalysisResult> => {
  try {
    const base64Image = await convertImageToBase64(file);
    
    const { data, error } = await supabase.functions.invoke("analyze-image", {
      body: { imageUrl: base64Image },
    });

    if (error) {
      console.error("Edge function error:", error);
      throw new Error(`画像解析エラー: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Image analysis error:", error);
    throw error;
  }
};