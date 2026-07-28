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
  /** 自分のコレクション側のメモ。カタログに登録しない場合の説明文の保存先。 */
  note?: string;
}

interface AddToCollectionResult {
  success: boolean;
  userItemId?: string;
  /**
   * 想定外の失敗のときだけ入る技術的なメッセージ（Supabase のエラーなど）。
   * **表示用の文言は入れない**。util からは t() が呼べないため、
   * ユーザーに見せる文言は呼び出し側が isAtLimit / maxSlots を見て t() で組み立てる。
   */
  error?: string;
  isAtLimit?: boolean;
  /** isAtLimit のときの枠上限数。呼び出し側が t() に渡して文言を組み立てる。 */
  maxSlots?: number;
  pointsAwarded?: number;
}

export interface IncrementItemQuantityResult {
  success: boolean;
  /** 更新後の所持数 */
  quantity?: number;
  /** 対象の user_item が見つからなかった（= まだコレクションに無い） */
  notFound?: boolean;
  error?: string;
}

// コレクションに追加（上限チェック＆ポイント付与付き）
export async function addToCollection(params: AddToCollectionParams): Promise<AddToCollectionResult> {
  const { userId, title, image, officialItemId, contentName, releaseDate, prize, theme, quantity = 1, note } = params;
  
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
      // 文言はここで作らない。呼び出し側が maxSlots を t() に渡して組み立てる。
      return {
        success: false,
        isAtLimit: true,
        maxSlots
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
        quantity,
        note: note || null
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
    // 表示用のフォールバック文言は呼び出し側が t() で用意する。
    return {
      success: false,
      error: error?.message
    };
  }
}

/**
 * 既にコレクションにある同じ公式グッズの所持数を +1 する。
 * 「もう1個持っている」を記録するための導線（重複追加の代わり）。
 *
 * ポイントは付与しない。同じ official_item への2回目の付与はサーバー側（claim_reward）が
 * 弾くため、呼ぶだけ無駄になる。
 */
export async function incrementItemQuantity(
  userId: string,
  officialItemId: string,
  by: number = 1
): Promise<IncrementItemQuantityResult> {
  try {
    const { data: existing, error: selectError } = await supabase
      .from("user_items")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("official_item_id", officialItemId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (selectError) throw selectError;
    if (!existing) return { success: false, notFound: true };

    const nextQuantity = (existing.quantity ?? 1) + by;

    const { error: updateError } = await supabase
      .from("user_items")
      .update({ quantity: nextQuantity })
      .eq("id", existing.id);

    if (updateError) throw updateError;

    return { success: true, quantity: nextQuantity };
  } catch (error) {
    console.error("Error incrementing item quantity:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// コンテンツ追加時のポイント付与。額と冪等性はサーバー側（claim_reward）が決める。
export async function awardContentAddPoints(_userId: string, contentId: string, _contentName: string) {
  const awarded = await claimReward("content_add", contentId);
  return { success: awarded, pointsAwarded: awarded ? 10 : 0 };
}
