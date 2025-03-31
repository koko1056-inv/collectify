
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
    
    return data.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      created_at: item.created_at,
      created_by: item.created_by,
      icon_name: item.icon_name
    }));
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
    
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      created_at: data.created_at,
      created_by: data.created_by,
      icon_name: data.icon_name
    };
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
    
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      created_at: data.created_at,
      created_by: data.created_by,
      icon_name: data.icon_name
    };
  } catch (error) {
    console.error('Exception in getContentById:', error);
    return null;
  }
}

// アイテムのコンテンツを設定する関数
export async function setItemContent(itemId: string, contentName: string | null, isUserItem: boolean = false): Promise<boolean> {
  if (!itemId) return false;
  
  try {
    const tableName = isUserItem ? "user_items" : "official_items";
    
    // content_idではなくcontent_nameを使用するように修正
    const { error } = await supabase
      .from(tableName)
      .update({ content_name: contentName })
      .eq('id', itemId);
    
    if (error) {
      console.error(`Error setting content for ${tableName}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Exception in setItemContent for ${itemId}:`, error);
    return false;
  }
}
