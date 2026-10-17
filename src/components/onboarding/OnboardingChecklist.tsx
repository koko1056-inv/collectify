import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCollectionGoals } from '@/hooks/useCollectionGoals';
import { useOnboardingRewardPoints } from '@/hooks/useOnboardingRewardPoints';
import { LEGACY_FULL_GUIDE_IDS, ONBOARDING_STEPS, type OnboardingStepId } from './steps';
import { guideHref } from './guideTasks';
import { motion, AnimatePresence } from 'framer-motion';
import { IconTile } from '@/components/ui/icon-tile';
import { CheckCircle2, ChevronDown, ChevronUp, ChevronRight, Gift, Minus, type LucideIcon } from 'lucide-react';
import { Pocke } from '@/components/pocke/Pocke';
import { NOTICE_PRIORITY, useNoticeTurn } from "@/components/collection/noticeSlot";

interface ChecklistItem {
  id: OnboardingStepId;
  labelKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  completed: boolean;
  /** サーバーが実際に付与する額。表に行が無い手順は undefined（「+pt」を出さない） */
  points: number | undefined;
}

/**
 * 「Collectifyはじめてガイド」。コレクション画面のいちばん上に出す。
 *
 * 以前は「はじめの一歩・コレクション・AIスタジオ・コミュニティ」の4グループ・10項目で、
 * 開くと画面がガイドで埋まり、AI やフォローまで並んで「何のアプリか」がぼやけていた。
 * いまはアプリの中心の流れ（作品を選ぶ → 登録 → 飾る → コンプの目標 → 交換）に沿った5項目を、番号付きで1列に並べる。
 * 並び順がそのまま推奨順で、畳んでいる間は「次にやること」を1件だけ見せる。
 *
 * 達成の判定はここでも行う（表示用）が、報酬の付与はサーバー（claim_completed_onboarding_rewards）が判定し、
 * OnboardingRewardWatcher が頼む。ここでは付与しない。
 */
export function OnboardingChecklist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  // 項目を押したら、その操作をする画面へ移り、押す場所を光らせて案内する（GuideHost）
  const goGuide = (id: OnboardingStepId) => {
    const href = guideHref(id);
    if (href) navigate(href);
  };
  const { goals } = useCollectionGoals(user?.id);
  const { data: rewardPoints } = useOnboardingRewardPoints();
  /**
   * 既定は畳む（「次にやること」1件だけ）。ユーザーが自分で開閉したら、その選択を以後優先する。
   * null = まだ決まっていない
   */
  const [expandPref, setExpandPref] = useState<boolean | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (user?.id) {
      const dismissed = localStorage.getItem(`checklist_dismissed_${user.id}`);
      if (dismissed) setIsDismissed(true);
      const expanded = localStorage.getItem(`checklist_expanded_${user.id}`);
      if (expanded === 'true') setExpandPref(true);
      else if (expanded === 'false') setExpandPref(false);
    }
  }, [user?.id]);

  const isExpanded = expandPref ?? false;

  const handleToggleExpand = () => {
    const next = !isExpanded;
    setExpandPref(next);
    if (user?.id) localStorage.setItem(`checklist_expanded_${user.id}`, String(next));
  };

  const { data: checklistData } = useQuery({
    queryKey: ['onboarding-checklist', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const [profileRes, itemsRes, tradeOfferRes, rewardsRes] = await Promise.all([
        supabase.from('profiles').select('interests, favorite_item_ids').eq('id', user.id).single(),
        // 件数も使う（推しグッズの達成条件が「5つ、持っているのが5つ未満なら持っている数」なので）
        supabase.from('user_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_items').select('id').eq('user_id', user.id).eq('for_trade', true).limit(1),
        supabase.from('onboarding_rewards').select('step_id').eq('user_id', user.id),
      ]);

      const profile = profileRes.data;
      const favCount = (profile?.favorite_item_ids as string[] | null)?.length ?? 0;
      const itemCount = itemsRes.count ?? 0;

      return {
        hasInterests: ((profile?.interests as string[] | null)?.length ?? 0) > 0,
        hasItem: itemCount > 0,
        // 5つ選ぶ。持っているグッズが5つ未満なら、持っている数だけ選べば達成（サーバーの判定と同じ）
        hasFavorites5: favCount >= Math.max(1, Math.min(5, itemCount)),
        hasTradeOffer: (tradeOfferRes.data?.length ?? 0) > 0,
        claimedSteps: new Set((rewardsRes.data ?? []).map((r) => r.step_id)),
      };
    },
    enabled: !!user?.id,
    // 達成したらすぐ完了の印を付けたいので、長くは持たない（画面に戻るたびに読み直す）
    staleTime: 1000 * 15,
    refetchOnWindowFocus: true,
  });

  const items: ChecklistItem[] = useMemo(() => {
    if (!checklistData) return [];
    const done: Record<OnboardingStepId, boolean> = {
      interests: checklistData.hasInterests,
      'first-item': checklistData.hasItem,
      favorites: checklistData.hasFavorites5,
      // 集めるもの（目標）は collection_goals（useCollectionGoals）。ピン留めした直後から完了にする
      goal: goals.length > 0,
      'trade-offer': checklistData.hasTradeOffer,
    };
    return ONBOARDING_STEPS.map((s) => ({
      id: s.id,
      labelKey: s.labelKey,
      descriptionKey: s.descriptionKey,
      icon: s.icon,
      completed: done[s.id],
      points: rewardPoints?.[s.id],
    }));
  }, [checklistData, goals.length, rewardPoints]);

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;
  // 以前の10項目のガイドを全部終えた人には、新しいガイドを出し直さない（終えたものが戻ってくると邪魔）
  const finishedLegacyGuide = !!checklistData && LEGACY_FULL_GUIDE_IDS.every((id) => checklistData.claimedSteps.has(id));
  /** 畳んでいる間に見せる「次にやること」。並び順がそのまま推奨順。 */
  const nextItem = items.find((i) => !i.completed);

  // × は「消す」ではなく「小さくする」。以前は × を押すと二度と出せなかった
  const handleDismiss = () => {
    if (user?.id) localStorage.setItem(`checklist_dismissed_${user.id}`, 'true');
    setIsDismissed(true);
  };

  const handleRestore = () => {
    if (user?.id) localStorage.removeItem(`checklist_dismissed_${user.id}`);
    setIsDismissed(false);
  };

  // コレクション画面のお知らせ枠では、予約の到着などもっと急ぐお知らせがあるときは控える
  const myTurn = useNoticeTurn("onboarding", NOTICE_PRIORITY.onboarding, !!checklistData && !allCompleted && !finishedLegacyGuide);
  if (!checklistData || allCompleted || finishedLegacyGuide || !myTurn) return null;

  if (isDismissed) {
    return (
      <button
        type="button"
        onClick={handleRestore}
        data-tour="collection-checklist"
        className="flex w-full items-center gap-2 rounded-xl border border-primary/20 bg-card px-3 py-2 text-left transition-colors hover:bg-accent"
        aria-label={t('misc.checklist.restore')}
      >
        <Pocke pose="peek" height={26} className="-my-1" />
        <span className="min-w-0 flex-1 truncate text-xs font-bold">{t('misc.checklist.title')}</span>
        <span className="text-2xs tabular-nums text-muted-foreground">
          {completedCount}/{totalCount}
        </span>
        {nextItem?.points ? (
          <span className="rounded-full bg-points-soft px-1.5 py-0.5 text-3xs font-bold tabular-nums text-points">
            +{nextItem.points}pt
          </span>
        ) : null}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <motion.div data-tour="collection-checklist" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm overflow-hidden">
        <CardContent className={isExpanded ? 'p-4 space-y-3' : 'p-3 space-y-2'}>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleToggleExpand}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? t('misc.checklist.close') : t('misc.checklist.open')}
              className="flex items-center gap-2 flex-1 min-w-0 text-left rounded-lg -m-1 p-1 transition-colors hover:bg-muted/40"
            >
              {/* 案内役のポッケ（頭と手だけ。枠からひょっこりのぞく） */}
              <Pocke pose="peek" height={42} className="-my-1 shrink-0" />
              <div className="min-w-0">
                <h3 className="font-bold text-sm">{t('misc.checklist.title')}</h3>
                <p className="text-xs text-muted-foreground">
                  {t('misc.checklist.progress', { done: completedCount, total: totalCount })}
                </p>
              </div>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="tap-safe-y h-7 w-7"
                aria-label={isExpanded ? t('misc.checklist.close') : t('misc.checklist.open')}
                onClick={handleToggleExpand}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="tap-safe-y h-7 w-7 text-muted-foreground"
                aria-label={t('misc.checklist.minimize')}
                title={t('misc.checklist.minimize')}
                onClick={handleDismiss}
              >
                <Minus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Progress value={progress} className={isExpanded ? 'h-2' : 'h-1.5'} />

          {/* 畳んでいるときの「次にやること」 */}
          {!isExpanded && nextItem && (
            <button
              type="button"
              onClick={() => goGuide(nextItem.id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors text-left"
            >
              <IconTile tone="primary" size="sm">
                <nextItem.icon />
              </IconTile>
              <div className="flex-1 min-w-0">
                <p className="text-3xs font-bold text-primary uppercase tracking-wider">{t('misc.checklist.nextUp')}</p>
                <p className="text-sm font-medium truncate">{t(nextItem.labelKey)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {nextItem.points ? (
                  <span className="text-xs font-bold tabular-nums text-points bg-points-soft px-2 py-0.5 rounded-full">
                    +{nextItem.points}pt
                  </span>
                ) : null}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          )}

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {/* 流れの一言。5項目がばらばらの用事ではなく、1本の流れの順番だと分かるように */}
                <p className="px-1 pb-2 text-2xs text-muted-foreground">{t('misc.checklist.flowHint')}</p>
                {/* 番号付きの1列。PC でも2列に割らない（順番が読み取れなくなる）。幅は広げすぎない */}
                <ol className="space-y-1.5 md:max-w-xl">
                  {items.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={item.completed ? undefined : () => goGuide(item.id)}
                          disabled={item.completed}
                          data-step={item.id}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                            item.completed ? 'bg-primary/5 opacity-60' : 'bg-muted/30 hover:bg-muted/60 cursor-pointer'
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold tabular-nums ${
                              item.completed ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground ring-1 ring-border'
                            }`}
                            aria-hidden="true"
                          >
                            {item.completed ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                          </span>
                          <Icon className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {t(item.labelKey)}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{t(item.descriptionKey)}</p>
                          </div>
                          {item.points ? (
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 flex items-center gap-0.5 ${
                                item.completed ? 'text-primary bg-primary/15' : 'text-primary bg-primary/10'
                              }`}
                            >
                              {item.completed ? <CheckCircle2 className="w-3 h-3" /> : <Gift className="w-3 h-3" />}+{item.points}pt
                            </span>
                          ) : (
                            !item.completed && <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
