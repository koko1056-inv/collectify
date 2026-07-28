import { supabase } from "@/integrations/supabase/client";
import { claimReward } from "@/hooks/useClaimReward";

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
      // レコードがない場合はサーバー側で作成
      await supabase.rpc("ensure_user_limits_row");
      const { data: newLimits, error: refetchError } = await supabase
        .from("user_limits")
        .select("collection_slots")
        .eq("user_id", userId)
        .single();
      if (refetchError) throw refetchError;
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
    
    // 5. ポイント付与。付与額と二重付与の判定はサーバー側（claim_reward）が持つ。
    //    同じ official_item に対しては初回のみ付与されるよう、
    //    reference_id を official_item_id 基準にする（カスタム品は user_item.id）。
    const awarded = await claimReward("item_add", officialItemId || userItem.id);
    const pointsAwarded = awarded ? 1 : 0;


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

// コンテンツ追加時のポイント付与。額と冪等性はサーバー側（claim_reward）が決める。
export async function awardContentAddPoints(_userId: string, contentId: string, _contentName: string) {
  const awarded = await claimReward("content_add", contentId);
  return { success: awarded, pointsAwarded: awarded ? 10 : 0 };
}
