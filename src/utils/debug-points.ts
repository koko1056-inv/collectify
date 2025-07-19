import { supabase } from "@/integrations/supabase/client";

// デバッグ用：ユーザーのポイント関連データをすべて確認
export async function debugUserPoints(userId: string) {
  console.log("[DEBUG] Starting comprehensive points debug for user:", userId);
  
  try {
    // user_pointsテーブルの確認
    const { data: userPoints, error: pointsError } = await supabase
      .from("user_points")
      .select("*")
      .eq("user_id", userId);
    console.log("[DEBUG] user_points table:", { userPoints, pointsError });
    
    // point_transactionsテーブルの確認
    const { data: transactions, error: transactionsError } = await supabase
      .from("point_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    console.log("[DEBUG] point_transactions table (last 10):", { transactions, transactionsError });
    
    // official_itemsテーブルでユーザーが作成したグッズの確認
    const { data: userItems, error: itemsError } = await supabase
      .from("official_items")
      .select("id, title, created_at")
      .eq("created_by", userId);
    console.log("[DEBUG] official_items created by user:", { userItems, itemsError });
    
    // content_namesテーブルでユーザーが作成したコンテンツの確認
    const { data: userContent, error: contentError } = await supabase
      .from("content_names")
      .select("id, name, created_at")
      .eq("created_by", userId);
    console.log("[DEBUG] content_names created by user:", { userContent, contentError });
    
    // テーブル構造の確認
    const { data: pointsTableInfo, error: tableError } = await supabase
      .from("user_points")
      .select("*")
      .limit(1);
    console.log("[DEBUG] user_points table structure:", { pointsTableInfo, tableError });
    
  } catch (error) {
    console.error("[DEBUG] Error during points debug:", error);
  }
}