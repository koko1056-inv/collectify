
import { supabase } from "@/integrations/supabase/client";
import { ContentInfo } from "./types";

// コンテンツ情報を取得する関数
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
    
    return data;
  } catch (error) {
    console.error('Exception in getAllContentNames:', error);
    return [];
  }
}

// コンテンツ名を追加する関数
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
    
    return data;
  } catch (error) {
    console.error('Exception in addContentName:', error);
    return null;
  }
}

// IDからコンテンツを取得する関数
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
    
    return data;
  } catch (error) {
    console.error('Exception in getContentById:', error);
    return null;
  }
}

