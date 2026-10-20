import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowLeftRight, Camera, Flame, Gift, Heart, Home, MessageCircle, Package, PenLine, Sparkles, Trophy, UserPlus, BookPlus, PackagePlus, type LucideIcon } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PointIcon } from "@/components/ui/point-icon";
import { IconTile } from "@/components/ui/icon-tile";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserPoints } from "@/hooks/usePoints";
import { openDailyLoginReward, useDailyLoginStatus } from "@/hooks/useDailyLoginReward";
import { useOnboardingRewardPoints } from "@/hooks/useOnboardingRewardPoints";
import { Pocke } from "@/components/pocke/Pocke";
import { ONBOARDING_STEPS } from "@/components/onboarding/steps";

/**
 * ポイントのもらい方（/point-shop/earn）。ポイントショップとマイページの「楽しむ」から入る。
 *
 * 以前はポイントショップの下に「無料でポイントを獲得」の固定の文言（投稿 +3pt…）があるだけで、
 * 推しフォト・なかよしLv・はじめてガイドなど、実際にもらえるものの半分が載っていなかった。
 * ここでは額を画面に直書きせず、サーバーの表（point_rewards / onboarding_reward_steps）から読む。
 * 表に行が無い・止めてある（is_active = false）ものは出さない。
 * → グッズの登録・コンプの報酬は 20261016060631（core_loop_points）で表に入った。
 * → ログインボーナスは 20261020050000（daily_login_rewards）で7日サイクルのカレンダーになり、
 *   ここでは専用のカード（DailyLoginEarnCard）にして、今日のポッケリングと同じシートを開く。
 *
 * 並びはアプリの中心（登録する → 眺める → コンプ → 交換）に合わせ、「コレクションを進める」を先頭にする。
 */

interface RewardRow {
  reason: string;
  points: number;
  is_active: boolean;
}

type Group = "collection" | "daily" | "oshi" | "social";

/**
 * reason ごとの見せ方。1日の上限（cap）の正はサーバーのトリガー（award_social_points の第4引数）。
 * 変えるときは両方そろえる。ここに無い reason は画面に出さない（説明の無い行を出さないため）。
 */
const RULES: { reason: string; group: Group; labelKey: string; icon: LucideIcon; noteKey?: string; cap?: number }[] = [
  // コレクションを進める（本題）
  { reason: "item_register", group: "collection", labelKey: "itemRegister", icon: Package, noteKey: "itemRegisterNote", cap: 10 },
  { reason: "series_complete", group: "collection", labelKey: "seriesComplete", icon: Trophy, noteKey: "seriesCompleteNote", cap: 3 },
  { reason: "trade_completed", group: "collection", labelKey: "tradeCompleted", icon: ArrowLeftRight, noteKey: "perDay", cap: 3 },
  { reason: "official_item_add", group: "collection", labelKey: "officialItemAdd", icon: PackagePlus, noteKey: "perItem" },
  { reason: "content_add", group: "collection", labelKey: "contentAdd", icon: BookPlus, noteKey: "perItem" },
  // 毎日
  { reason: "daily_ring", group: "daily", labelKey: "dailyRing", icon: Flame, noteKey: "perDay", cap: 1 },
  { reason: "daily_mission", group: "daily", labelKey: "dailyMission", icon: Sparkles, noteKey: "perDay", cap: 1 },
  { reason: "daily_photo", group: "daily", labelKey: "dailyPhoto", icon: Camera, noteKey: "perDay", cap: 1 },
  // みんなと
  { reason: "post_create", group: "social", labelKey: "postCreate", icon: PenLine, noteKey: "perDay", cap: 3 },
  { reason: "post_comment", group: "social", labelKey: "postComment", icon: MessageCircle, noteKey: "perDay", cap: 5 },
  { reason: "reaction_received", group: "social", labelKey: "reactionReceived", icon: Heart, noteKey: "perDay", cap: 10 },
  { reason: "request_accepted", group: "social", labelKey: "requestAccepted", icon: Sparkles },
  { reason: "welcome_bonus", group: "social", labelKey: "welcomeBonus", icon: Gift, noteKey: "once" },
];

/** 招待のボーナス。額は redeem_invite_code の中の定数（point_rewards の表には無い） */
const REFERRAL_BONUS = 50;

interface Line {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  note?: string;
}

export default function PointsEarn() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: userPoints, isLoading: pointsLoading } = useUserPoints();
  const { data: dailyLogin } = useDailyLoginStatus();
  const { data: stepPoints } = useOnboardingRewardPoints();

  const rewards = useQuery({
    queryKey: ["point-rewards"],
    queryFn: async (): Promise<RewardRow[]> => {
      const { data, error } = await supabase.from("point_rewards").select("reason, points, is_active").eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as RewardRow[];
    },
    staleTime: 1000 * 60 * 30,
    meta: { silentError: true },
  });

  const history = useQuery({
    queryKey: ["pointTransactions", user?.id, "earn-page"],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_transactions")
        .select("id, points, transaction_type, description, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    meta: { silentError: true },
  });

  const groups = useMemo(() => {
    const k = (key: string, vars?: Record<string, string | number>) => t(`screens.pointShop.earn.${key}`, vars);
    const byReason = new Map((rewards.data ?? []).map((r) => [r.reason, r]));
    const out: Record<Group, Line[]> = { collection: [], daily: [], oshi: [], social: [] };

    for (const rule of RULES) {
      const row = byReason.get(rule.reason);
      if (!row) continue;
      out[rule.group].push({
        key: rule.reason,
        icon: rule.icon,
        label: k(rule.labelKey),
        value: `+${row.points}pt`,
        note: rule.noteKey ? k(rule.noteKey, { n: rule.cap ?? 0 }) : undefined,
      });
    }

    // はじめてガイド（画面に出している項目のうち、サーバーで有効なものの合計）。
    // コレクションの流れに沿った項目なので「コレクションを進める」に入れる
    const guideTotal = ONBOARDING_STEPS.reduce((sum, s) => sum + (stepPoints?.[s.id] ?? 0), 0);
    if (guideTotal > 0) {
      out.collection.push({ key: "onboarding", icon: Sparkles, label: k("onboarding"), value: `+${guideTotal}pt`, note: k("onboardingNote") });
    }

    // なかよしLv（companion_lv2〜10 をまとめて1行）
    const lv = (rewards.data ?? []).filter((r) => /^companion_lv\d+$/.test(r.reason)).map((r) => r.points);
    if (lv.length > 0) {
      out.oshi.push({
        key: "companion",
        icon: Home,
        label: k("companionLevel"),
        value: k("range", { min: Math.min(...lv), max: Math.max(...lv) }),
        note: k("companionLevelNote"),
      });
    }

    out.social.push({ key: "referral", icon: UserPlus, label: k("referral"), value: `+${REFERRAL_BONUS}pt` });
    return out;
  }, [rewards.data, stepPoints, t]);

  const GROUP_ORDER: { id: Group; titleKey: string }[] = [
    { id: "collection", titleKey: "groupCollection" },
    { id: "daily", titleKey: "groupDaily" },
    { id: "oshi", titleKey: "groupOshi" },
    { id: "social", titleKey: "groupSocial" },
  ];

  return (
    <div className="min-h-screen bg-background pb-nav">
      <Navbar />
      <div className="container max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t("misc.common.back")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{t("screens.pointShop.earn.title")}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t("screens.pointShop.earn.subtitle")}</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <PointIcon size={36} />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{t("screens.pointShop.earn.balance")}</p>
              {pointsLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <p className="text-xl font-bold tabular-nums">
                  {(userPoints?.total_points ?? 0).toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground"> pt</span>
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/point-shop")}>
              {t("screens.pointShop.title")}
            </Button>
          </CardContent>
        </Card>

        {/* ログインボーナス（7日サイクルのカレンダー）。本体は DailyLoginRewardSheet（今日のポッケリングと共通） */}
        {dailyLogin && (
          <button type="button" onClick={openDailyLoginReward} className="block w-full text-left">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background transition-colors hover:bg-accent/40">
              <CardContent className="flex items-center gap-3 p-4">
                <Pocke pose={dailyLogin.claimed_today ? "wink" : "wave"} height={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{t("pocke.dailyLogin.openFromEarn")}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Flame className="h-3.5 w-3.5 text-warning" aria-hidden />
                    {t("pocke.dailyLogin.streak", { n: dailyLogin.streak })}
                    {" · "}
                    {dailyLogin.claimed_today ? t("pocke.dailyLogin.claimed") : t("pocke.dailyLogin.claim")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </button>
        )}

        {rewards.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : rewards.isError ? (
          <QueryErrorState title={t("screens.pointShop.exchangeLoadFailed")} onRetry={() => rewards.refetch()} />
        ) : (
          GROUP_ORDER.map((g) =>
            groups[g.id].length === 0 ? null : (
              <section key={g.id} className="space-y-2" data-earn-group={g.id}>
                <h2 className="text-sm font-bold">{t(`screens.pointShop.earn.${g.titleKey}`)}</h2>
                <Card>
                  <CardContent className="divide-y p-0">
                    {groups[g.id].map((line) => (
                      <div key={line.key} className="flex items-center gap-3 px-4 py-3" data-earn={line.key}>
                        <IconTile tone={g.id === "collection" ? "primary" : "muted"} size="sm">
                          <line.icon />
                        </IconTile>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{line.label}</p>
                          {line.note && <p className="text-2xs text-muted-foreground">{line.note}</p>}
                        </div>
                        <span className="shrink-0 rounded-full bg-points-soft px-2 py-0.5 text-xs font-bold tabular-nums text-points">{line.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>
            )
          )
        )}

        {/* ポイントの記録。以前はどこにも出ておらず、「+3pt」の通知が来ても何で増えたのか後から確かめられなかった */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold">{t("screens.pointShop.earn.historyTitle")}</h2>
          <Card>
            <CardContent className="p-0">
              {history.isLoading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : history.isError ? (
                <p className="p-4 text-sm text-muted-foreground">{t("screens.pointShop.earn.historyLoadFailed")}</p>
              ) : (history.data ?? []).length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">{t("screens.pointShop.earn.historyEmpty")}</p>
              ) : (
                <ul className="divide-y">
                  {(history.data ?? []).map((row) => (
                    <li key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{row.description || row.transaction_type}</p>
                        <p className="text-3xs text-muted-foreground tabular-nums">{new Date(row.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`shrink-0 text-sm font-bold tabular-nums ${row.points >= 0 ? "text-points" : "text-muted-foreground"}`}>
                        {row.points >= 0 ? `+${row.points}` : row.points}pt
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
      <Footer />
    </div>
  );
}
