import { useDailyLoginStatus, type DailyLoginWeekDay } from "@/hooks/useDailyLoginReward";

/**
 * 「今日のチェック」に出す情報。連続ログイン日数・今日の報酬・受け取り済みか。
 * 推しの作品の新着グッズは、ここでは読まない。「推しの新商品」の画面（/releases）と、
 * その入口のバッジ（useOshiNewBadge: 最後に見た時刻からの件数）に移した。
 *
 * 報酬の付与そのものは get_daily_login_status / claim_daily_login_reward（サーバー）が行う。
 * 以前はポイント固定の login_bonus_tiers を読んでいたが、7日サイクルのカレンダー
 * （daily_login_calendar）に替わったので、ここも今日の実際の報酬を返す。
 */
export function useDailyHub() {
  const status = useDailyLoginStatus();

  const todayReward: DailyLoginWeekDay | null = status.data?.week.find((d) => d.is_today) ?? null;

  return {
    streak: status.data?.streak ?? 0,
    claimedToday: status.data?.claimed_today ?? false,
    todayReward,
    ready: status.isSuccess,
  };
}
