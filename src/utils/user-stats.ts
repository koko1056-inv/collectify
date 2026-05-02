import { supabase } from "@/integrations/supabase/client";

export interface UserStats {
  totalLoginDays: number;
  totalItemsAdded: number;
  totalContentAdded: number;
  memberSince: string;
  currentStreak: number;
}

// 過去の活動履歴からポイントを遡って計算・付与
// セキュリティ強化により、point_transactions への直接 INSERT は禁止されました。
// 遡及計算が必要な場合は将来的にサーバー側 RPC で実装します。
export async function calculateAndAwardHistoricalPoints(_userId: string) {
  console.warn(
    "[calculateAndAwardHistoricalPoints] クライアントから point_transactions への書き込みは禁止されています。サーバー側 RPC が必要です。"
  );
  return {
    pointsAdded: 0,
    transactionsAdded: 0,
  };
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