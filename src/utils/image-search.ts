
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

/**
 * 画像ファイルを解析してSupabase Edge Functionを呼び出す
 */
export const analyzeImageFile = async (file: File) => {
  try {
    // 1. 画像をBase64に変換
    const base64Image = await convertImageToBase64(file);
    
    // 2. Supabase Edge Functionに送信
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
