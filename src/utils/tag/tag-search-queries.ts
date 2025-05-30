
import { supabase } from "@/integrations/supabase/client";

interface Tag {
  id: string;
  name: string;
  category?: string;
  created_at?: string;
}

/**
 * タグ名からタグIDを検索する関数
 */
export async function findTagIdByName(tagName: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('id')
      .eq('name', tagName)
      .single();

    if (error) {
      console.error('Error finding tag ID by name:', error);
      return null;
    }

    return data ? data.id : null;
  } catch (error) {
    console.error('Error finding tag ID by name:', error);
    return null;
  }
}

/**
 * 与えられたオブジェクトがTag型かどうかを判定するType Guard
 */
export function isSimpleTag(obj: any): obj is Tag {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string'
  );
}
