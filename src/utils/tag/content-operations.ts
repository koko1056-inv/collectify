import { supabase } from "@/integrations/supabase/client";
import { ContentInfo } from "./types";

// 型定義を修正して icon_name プロパティを追加
interface ContentData {
  id: string;
  name: string;
  type: string;
  created_at: string;
  created_by: string;
  icon_name?: string; // オプショナルプロパティとして追加
}

// 以下の関数を修正し、icon_nameプロパティの処理を適切に行います
export async function getAllContentNames(): Promise<ContentInfo[]> {
  try {
    const { data, error } = await supabase
      .from('content_names')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching content names:', error);
      return [];
    }
    
    // アイコン名がない場合はundefinedにします
    return data.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      created_at: item.created_at,
      created_by: item.created_by,
      icon_name: item.icon_name || undefined
    }));
  } catch (error) {
    console.error('Exception in getAllContentNames:', error);
    return [];
  }
}

// その他の関数も同様に修正します
// ...

// 以下の関数も icon_name プロパティを適切に処理するように修正
export async function addContentName(name: string, type: string = 'other'): Promise<ContentInfo | null> {
  if (!name.trim()) return null;
  
  try {
    const { data, error } = await supabase
      .from('content_names')
      .insert([{ name, type, created_by: 'system' }])
      .select('*')
      .single();
    
    if (error) {
      console.error('Error adding content name:', error);
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      created_at: data.created_at,
      created_by: data.created_by,
      icon_name: data.icon_name || undefined
    };
  } catch (error) {
    console.error('Exception in addContentName:', error);
    return null;
  }
}

// 他の関数も同様に修正します
// ...

// getContentByIdも同様に修正
export async function getContentById(id: string): Promise<ContentInfo | null> {
  if (!id) return null;
  
  try {
    const { data, error } = await supabase
      .from('content_names')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching content by ID:', error);
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      created_at: data.created_at,
      created_by: data.created_by,
      icon_name: data.icon_name || undefined
    };
  } catch (error) {
    console.error('Exception in getContentById:', error);
    return null;
  }
}

// 他の既存の関数はそのまま保持します
// ...
