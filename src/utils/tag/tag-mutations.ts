
import { supabase } from "@/integrations/supabase/client";
import { TagUpdate } from "@/types/tag";
import { SimpleItemTag } from "./types";

// ユーザーアイテムのタグを更新する関数
export async function updateUserItemTags(
  itemId: string,
  updates: TagUpdate[]
): Promise<SimpleItemTag[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("User not authenticated");

  // タグの追加と削除を実行
  for (const update of updates) {
    if (update.value === null) {
      // タグを削除
      await removeUserItemTag(itemId, update.category);
    } else {
      // タグを追加
      await addUserItemTag(itemId, update.category, update.value);
    }
  }

  // 更新後のタグリストを取得して返す
  const { data, error } = await supabase
    .from("user_item_tags")
    .select(`
      id,
      tag_id,
      tags (
        id,
        name,
        category
      )
    `)
    .eq("user_item_id", itemId);

  if (error) throw error;
  return data || [];
}

// アイテムタグを削除する関数
async function removeUserItemTag(
  itemId: string,
  category: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("User not authenticated");

  // 特定のカテゴリのタグを持つタグIDを見つける
  const { data: tags } = await supabase
    .from("tags")
    .select("id")
    .eq("category", category);

  if (!tags || tags.length === 0) return;

  const tagIds = tags.map(tag => tag.id);

  // そのカテゴリのタグ関連を削除
  const { error } = await supabase
    .from("user_item_tags")
    .delete()
    .eq("user_item_id", itemId)
    .in("tag_id", tagIds);

  if (error) throw error;
}

// ユーザーアイテムにタグを追加する関数
async function addUserItemTag(
  itemId: string,
  category: string,
  tagName: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("User not authenticated");

  // タグが存在するか確認
  let { data: existingTag } = await supabase
    .from("tags")
    .select("id")
    .eq("name", tagName)
    .maybeSingle();

  let tagId: string;

  if (!existingTag) {
    // タグが存在しない場合は作成
    const { data: newTag, error: createError } = await supabase
      .from("tags")
      .insert({
        name: tagName,
        category,
      })
      .select("id")
      .single();

    if (createError) throw createError;
    tagId = newTag.id;
  } else {
    tagId = existingTag.id;
  }

  // 既に同じタグが付けられているか確認
  const { data: existingRelation } = await supabase
    .from("user_item_tags")
    .select("id")
    .eq("user_item_id", itemId)
    .eq("tag_id", tagId)
    .maybeSingle();

  if (existingRelation) return; // 既に関連付けられている場合は何もしない

  // タグとアイテムを関連付ける
  const { error } = await supabase
    .from("user_item_tags")
    .insert({
      user_item_id: itemId,
      tag_id: tagId,
      user_id: user.id
    });

  if (error) throw error;
}

// 公式アイテムのタグを更新する関数
export async function updateOfficialItemTags(
  itemId: string,
  updates: TagUpdate[]
): Promise<SimpleItemTag[]> {
  // タグの追加と削除を実行
  for (const update of updates) {
    if (update.value === null) {
      // タグを削除
      await removeOfficialItemTag(itemId, update.category);
    } else {
      // タグを追加
      await addOfficialItemTag(itemId, update.category, update.value);
    }
  }

  // 更新後のタグリストを取得して返す
  const { data, error } = await supabase
    .from("item_tags")
    .select(`
      id,
      tag_id,
      tags (
        id,
        name,
        category
      )
    `)
    .eq("official_item_id", itemId);

  if (error) throw error;
  return data || [];
}

// 公式アイテムからタグを削除する関数
async function removeOfficialItemTag(
  itemId: string,
  category: string
): Promise<void> {
  // 特定のカテゴリのタグを持つタグIDを見つける
  const { data: tags } = await supabase
    .from("tags")
    .select("id")
    .eq("category", category);

  if (!tags || tags.length === 0) return;

  const tagIds = tags.map(tag => tag.id);

  // そのカテゴリのタグ関連を削除
  const { error } = await supabase
    .from("item_tags")
    .delete()
    .eq("official_item_id", itemId)
    .in("tag_id", tagIds);

  if (error) throw error;
}

// 公式アイテムにタグを追加する関数
async function addOfficialItemTag(
  itemId: string,
  category: string,
  tagName: string
): Promise<void> {
  // タグが存在するか確認
  let { data: existingTag } = await supabase
    .from("tags")
    .select("id")
    .eq("name", tagName)
    .maybeSingle();

  let tagId: string;

  if (!existingTag) {
    // タグが存在しない場合は作成
    const { data: newTag, error: createError } = await supabase
      .from("tags")
      .insert({
        name: tagName,
        category,
      })
      .select("id")
      .single();

    if (createError) throw createError;
    tagId = newTag.id;
  } else {
    tagId = existingTag.id;
  }

  // 既に同じタグが付けられているか確認
  const { data: existingRelation } = await supabase
    .from("item_tags")
    .select("id")
    .eq("official_item_id", itemId)
    .eq("tag_id", tagId)
    .maybeSingle();

  if (existingRelation) return; // 既に関連付けられている場合は何もしない

  // タグとアイテムを関連付ける
  const { error } = await supabase
    .from("item_tags")
    .insert({
      official_item_id: itemId,
      tag_id: tagId,
    });

  if (error) throw error;
}
