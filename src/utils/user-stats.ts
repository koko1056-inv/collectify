import { supabase } from "@/integrations/supabase/client";

export interface UserStats {
  totalLoginDays: number;
  totalItemsAdded: number;
  totalContentAdded: number;
  memberSince: string;
  currentStreak: number;
}

// 過去の活動履歴からポイントを遡って計算・付与
export async function calculateAndAwardHistoricalPoints(userId: string) {
  try {
    // 既存のポイント履歴を確認
    const { data: existingTransactions } = await supabase
      .from("point_transactions")
      .select("transaction_type, reference_id")
      .eq("user_id", userId);

    // 過去に作成したグッズの数を取得
    const { data: userItems, error: itemsError } = await supabase
      .from("official_items")
      .select("id, created_at")
      .eq("created_by", userId);

    if (itemsError) throw itemsError;

    // 過去に作成したコンテンツ名の数を取得
    const { data: userContent, error: contentError } = await supabase
      .from("content_names")
      .select("id, created_at")
      .eq("created_by", userId);

    if (contentError) throw contentError;

    let totalPointsToAdd = 0;
    const transactionsToInsert = [];

    // グッズ追加ポイントの計算
    const existingItemTransactions = existingTransactions?.filter(t => 
      t.transaction_type === 'item_add') || [];
    const existingItemIds = new Set(existingItemTransactions.map(t => t.reference_id));

    for (const item of userItems || []) {
      if (!existingItemIds.has(item.id)) {
        totalPointsToAdd += 5;
        transactionsToInsert.push({
          user_id: userId,
          points: 5,
          transaction_type: 'item_add',
          description: 'グッズ追加（遡及）',
          reference_id: item.id,
          created_at: item.created_at
        });
      }
    }

    // コンテンツ追加ポイントの計算
    const existingContentTransactions = existingTransactions?.filter(t => 
      t.transaction_type === 'content_add') || [];
    const existingContentIds = new Set(existingContentTransactions.map(t => t.reference_id));

    for (const content of userContent || []) {
      if (!existingContentIds.has(content.id)) {
        totalPointsToAdd += 10;
        transactionsToInsert.push({
          user_id: userId,
          points: 10,
          transaction_type: 'content_add',
          description: 'コンテンツ追加（遡及）',
          reference_id: content.id,
          created_at: content.created_at
        });
      }
    }

    // ポイント履歴を一括挿入
    if (transactionsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("point_transactions")
        .insert(transactionsToInsert);

      if (insertError) throw insertError;

      // 総ポイント数を更新（サーバーサイド関数使用）
      await supabase.rpc('add_user_points', {
        _user_id: userId,
        _points: totalPointsToAdd,
        _transaction_type: 'retroactive_calc',
        _description: '過去ポイント一括計算'
      });
    }

    return {
      pointsAdded: totalPointsToAdd,
      transactionsAdded: transactionsToInsert.length
    };
  } catch (error) {
    console.error("過去ポイント計算エラー:", error);
    throw error;
  }
}

// ユーザー統計情報を取得
export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    // プロフィール作成日（メンバー開始日）を取得
    const { data: profile } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("id", userId)
      .single();

    // グッズ追加数を取得
    const { count: itemsCount } = await supabase
      .from("official_items")
      .select("*", { count: "exact" })
      .eq("created_by", userId);

    // コンテンツ追加数を取得
    const { count: contentCount } = await supabase
      .from("content_names")
      .select("*", { count: "exact" })
      .eq("created_by", userId);

    // ログインボーナス取得履歴からログイン日数を計算
    const { data: loginTransactions } = await supabase
      .from("point_transactions")
      .select("created_at")
      .eq("user_id", userId)
      .eq("transaction_type", "login_bonus")
      .order("created_at", { ascending: false });

    // 連続ログイン日数を計算
    let currentStreak = 0;
    if (loginTransactions && loginTransactions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let checkDate = new Date(today);
      
      for (const transaction of loginTransactions) {
        const loginDate = new Date(transaction.created_at);
        loginDate.setHours(0, 0, 0, 0);
        
        if (loginDate.getTime() === checkDate.getTime()) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return {
      totalLoginDays: loginTransactions?.length || 0,
      totalItemsAdded: itemsCount || 0,
      totalContentAdded: contentCount || 0,
      memberSince: profile?.created_at || "",
      currentStreak
    };
  } catch (error) {
    console.error("ユーザー統計取得エラー:", error);
    throw error;
  }
}