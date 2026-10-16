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
  /**
   * 交換に出すか。登録時にここで受け取れるようにしてある。
   * 以前は登録後にグッズ詳細モーダルを開いてスイッチを探すしか経路が無く、
   * 本番の user_items 254件すべてが for_trade=false のままだった
   * （= 交換マッチングが構造的に1件も出ない状態だった）。
   */
  forTrade?: boolean;
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
  const { userId, title, image, officialItemId, contentName, releaseDate, prize, theme, quantity = 1, forTrade = false, note } = params;
  
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
        for_trade: forTrade,
        note: note || null
      })
      .select("id")
      .single();
    
    if (insertError) throw insertError;
    
    // グッズを追加してもポイントは付かない（ポイントは投稿・コメント・交換など、交流に付く。サーバー側のトリガーが付与する）。
    const pointsAwarded = 0;

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

/** まとめて追加する1件分（カタログのグッズ） */
export interface BulkAddItem {
  officialItemId: string;
  title: string;
  image: string | null;
  contentName?: string | null;
  releaseDate?: string | null;
  prize?: string | null;
}

export interface AddManyToCollectionResult {
  success: boolean;
  /** 実際に追加できた数 */
  added: number;
  /** すでに持っていたので除いた数 */
  skippedOwned: number;
  /** 枠が足りないとき true。added は 0 のまま（一部だけ入れると、どれが入ったか分かりにくいため） */
  isAtLimit?: boolean;
  maxSlots?: number;
  /** あと何個まで入るか（isAtLimit のとき） */
  remainingSlots?: number;
  /** 想定外の失敗のときだけ入る技術的なメッセージ。表示はしない */
  error?: string;
}

/** 1回でまとめて入れる上限。数百件の insert を1回で送ると重くなるので、ここで止める */
export const BULK_ADD_MAX = 300;

/**
 * カタログのグッズを、まとめてコレクションに追加する。
 *
 * 推し活の人はグッズを数十〜数百個持っているのに、以前は1個ずつしか登録できず、
 * 最初の登録の手間がいちばんの離脱ポイントになっていた。
 * ここでは 1回の insert で user_items に複数行を入れる（1件ずつ送ると、件数ぶん往復が増え、途中で失敗したときの状態も分かりにくい）。
 *  - 既に持っている公式グッズは除く（同じグッズが2行になると、数量の管理と交換のマッチングが崩れる）
 *  - 枠が足りないときは何も入れずに知らせる（どれが入ってどれが入らなかったかを利用者に追わせない）
 * 数量は1個ずつ。同じものを複数持っているときは、追加したあとに既存の数量変更でできる。
 */
export async function addManyToCollection(userId: string, items: BulkAddItem[]): Promise<AddManyToCollectionResult> {
  // 同じグッズが2回選ばれていても1行にする
  const unique = [...new Map(items.map((i) => [i.officialItemId, i])).values()];
  if (unique.length === 0) return { success: true, added: 0, skippedOwned: 0 };
  try {
    // 1. 既に持っているものを除く（選んでいる間に別の画面で追加した、などに備えてサーバーで確かめる）
    const owned = new Set<string>();
    const ids = unique.map((i) => i.officialItemId);
    // URL が長くなりすぎないよう、問い合わせは100件ずつ
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error } = await supabase
        .from("user_items")
        .select("official_item_id")
        .eq("user_id", userId)
        .in("official_item_id", ids.slice(i, i + 100));
      if (error) throw error;
      for (const r of data ?? []) if (r.official_item_id) owned.add(r.official_item_id);
    }
    const toAdd = unique.filter((i) => !owned.has(i.officialItemId)).slice(0, BULK_ADD_MAX);
    if (toAdd.length === 0) return { success: true, added: 0, skippedOwned: owned.size };

    // 2. 枠の確認（1件追加と同じ考え方）
    const limitsRes = await supabase.from("user_limits").select("collection_slots").eq("user_id", userId).single();
    let limits = limitsRes.data;
    const limitsError = limitsRes.error;
    if (limitsError && limitsError.code === "PGRST116") {
      await supabase.rpc("ensure_user_limits_row");
      const refetched = await supabase.from("user_limits").select("collection_slots").eq("user_id", userId).single();
      if (refetched.error) throw refetched.error;
      limits = refetched.data;
    } else if (limitsError) {
      throw limitsError;
    }
    const maxSlots = limits?.collection_slots || 100;
    const { count, error: countError } = await supabase
      .from("user_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if (countError) throw countError;
    const remainingSlots = Math.max(0, maxSlots - (count || 0));
    if (toAdd.length > remainingSlots) {
      return { success: false, added: 0, skippedOwned: owned.size, isAtLimit: true, maxSlots, remainingSlots };
    }

    // 3. まとめて1回で入れる
    const today = new Date().toISOString().split("T")[0];
    const { data: inserted, error: insertError } = await supabase
      .from("user_items")
      .insert(
        toAdd.map((i) => ({
          user_id: userId,
          title: i.title,
          image: i.image ?? "",
          official_item_id: i.officialItemId,
          content_name: i.contentName || null,
          release_date: i.releaseDate || today,
          prize: i.prize || "0",
          quantity: 1,
          for_trade: false,
        }))
      )
      .select("id");
    if (insertError) throw insertError;
    return { success: true, added: inserted?.length ?? toAdd.length, skippedOwned: owned.size };
  } catch (error) {
    console.error("Error adding many to collection:", error);
    return { success: false, added: 0, skippedOwned: 0, error: error instanceof Error ? error.message : String(error) };
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
  _userId: string,
  officialItemId: string,
  by: number = 1
): Promise<IncrementItemQuantityResult> {
  try {
    // read-modify-write だと連続タップや数量編集との同時更新で
    // 1回分が失われるため、行ロック付きの RPC でサーバー側に任せる。
    const { data, error } = await supabase.rpc("increment_item_quantity", {
      _official_item_id: officialItemId,
      _by: by,
    });

    if (error) throw error;

    const result = (data ?? {}) as { success?: boolean; not_found?: boolean; quantity?: number };
    if (!result.success) {
      return { success: false, notFound: result.not_found === true };
    }
    return { success: true, quantity: result.quantity };
  } catch (error) {
    console.error("Error incrementing item quantity:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** 公式グッズのタグを、コレクションの行にも写す（絞り込み・コンプの的はこのタグで数える） */
export async function copyOfficialItemTags(userItemId: string, officialItemId: string): Promise<void> {
  const { data: tags, error } = await supabase.from("item_tags").select("tag_id").eq("official_item_id", officialItemId);
  if (error || !tags || tags.length === 0) return;
  await supabase.from("user_item_tags").insert(tags.map((tag) => ({ user_item_id: userItemId, tag_id: tag.tag_id })));
}

// コンテンツ追加時のポイント付与。額と冪等性はサーバー側（claim_reward）が決める。
export async function awardContentAddPoints(_userId: string, contentId: string, _contentName: string) {
  const awarded = await claimReward("content_add", contentId);
  return { success: awarded, pointsAwarded: awarded ? 10 : 0 };
}
