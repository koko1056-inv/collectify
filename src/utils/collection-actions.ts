import { supabase } from "@/integrations/supabase/client";

interface AddToCollectionParams {
  userId: string;
  title: string;
  image: string;
  officialItemId?: string;
  contentName?: string;
  releaseDate?: string;
  prize?: string;
  theme?: string;
  quantity?: number;
}

interface AddToCollectionResult {
  success: boolean;
  userItemId?: string;
  error?: string;
  isAtLimit?: boolean;
  pointsAwarded?: number;
}

// コレクションに追加（上限チェック＆ポイント付与付き）
export async function addToCollection(params: AddToCollectionParams): Promise<AddToCollectionResult> {
  const { userId, title, image, officialItemId, contentName, releaseDate, prize, theme, quantity = 1 } = params;
  
  try {
    // 1. ユーザーの上限を確認
    let { data: limits, error: limitsError } = await supabase
      .from("user_limits")
      .select("collection_slots")
      .eq("user_id", userId)
      .single();
    
    if (limitsError && limitsError.code === 'PGRST116') {
      // レコードがない場合は作成
      const { data: newLimits, error: insertError } = await supabase
        .from("user_limits")
        .insert({ user_id: userId })
        .select("collection_slots")
        .single();
      
      if (insertError) throw insertError;
      limits = newLimits;
    } else if (limitsError) {
      throw limitsError;
    }
    
    const maxSlots = limits?.collection_slots || 100;
    
    // 2. 現在のコレクション数を確認
    const { count, error: countError } = await supabase
      .from("user_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    
    if (countError) throw countError;
    
    const currentCount = count || 0;
    
    // 3. 上限チェック
    if (currentCount >= maxSlots) {
      return {
        success: false,
        isAtLimit: true,
        error: `コレクション枠が上限（${maxSlots}個）に達しています。ポイントショップで枠を追加購入してください。`
      };
    }
    
    // 4. コレクションに追加
    const { data: userItem, error: insertError } = await supabase
      .from("user_items")
      .insert({
        user_id: userId,
        title,
        image,
        official_item_id: officialItemId,
        content_name: contentName,
        release_date: releaseDate || new Date().toISOString().split('T')[0],
        prize: prize || "0",
        theme: theme || null,
        quantity
      })
      .select("id")
      .single();
    
    if (insertError) throw insertError;
    
    // 5. ポイント付与（1pt）
    let pointsAwarded = 0;
    const { data: userPoints } = await supabase
      .from("user_points")
      .select("total_points")
      .eq("user_id", userId)
      .single();
    
    const currentPoints = userPoints?.total_points || 0;
    const newPoints = currentPoints + 1;
    
    // ポイント更新
    if (userPoints) {
      await supabase
        .from("user_points")
        .update({ total_points: newPoints })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("user_points")
        .insert({ user_id: userId, total_points: 1 });
    }
    
    // ポイント履歴に記録
    await supabase
      .from("point_transactions")
      .insert({
        user_id: userId,
        points: 1,
        transaction_type: "item_add",
        description: `グッズ追加: ${title}`,
        reference_id: userItem.id
      });
    
    pointsAwarded = 1;
    
    return {
      success: true,
      userItemId: userItem.id,
      pointsAwarded
    };
  } catch (error: any) {
    console.error("Error adding to collection:", error);
    return {
      success: false,
      error: error.message || "コレクションへの追加に失敗しました"
    };
  }
}

// コンテンツ追加時のポイント付与（10pt）
export async function awardContentAddPoints(userId: string, contentId: string, contentName: string) {
  try {
    // ポイント更新
    const { data: userPoints } = await supabase
      .from("user_points")
      .select("total_points")
      .eq("user_id", userId)
      .single();
    
    const currentPoints = userPoints?.total_points || 0;
    const newPoints = currentPoints + 10;
    
    if (userPoints) {
      await supabase
        .from("user_points")
        .update({ total_points: newPoints })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("user_points")
        .insert({ user_id: userId, total_points: 10 });
    }
    
    // ポイント履歴に記録
    await supabase
      .from("point_transactions")
      .insert({
        user_id: userId,
        points: 10,
        transaction_type: "content_add",
        description: `コンテンツ追加: ${contentName}`,
        reference_id: contentId
      });
    
    return { success: true, pointsAwarded: 10 };
  } catch (error) {
    console.error("Error awarding content add points:", error);
    return { success: false, pointsAwarded: 0 };
  }
}
