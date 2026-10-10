import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { ONBOARDING_STEP_POINTS, type OnboardingStepId } from './steps';
import { guideHref } from './guideTasks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  User,
  Package,
  Star,
  Home,
  UserCircle2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Gift,
  Sparkles,
  Minus,
  Heart,
  Users,
  Wand2,
  Compass,
  ArrowLeftRight,
  type LucideIcon,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  completed: boolean;
  action?: () => void;
  points: number;
  freeTrial?: boolean;
  group: 'start' | 'collection' | 'ai' | 'community';
}

const GROUP_META: Record<
  ChecklistItem['group'],
  { labelKey: string; icon: LucideIcon; color: string }
> = {
  start: { labelKey: 'misc.checklist.groupStart', icon: Sparkles, color: 'text-amber-500' },
  collection: {
    labelKey: 'misc.checklist.groupCollection',
    icon: Package,
    color: 'text-emerald-500',
  },
  ai: { labelKey: 'misc.checklist.groupAi', icon: Wand2, color: 'text-fuchsia-500' },
  community: { labelKey: 'misc.checklist.groupCommunity', icon: Users, color: 'text-blue-500' },
};

export function OnboardingChecklist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // 項目を押したら、その操作をする画面へ移り、押す場所を光らせて案内する（GuideHost）
  const goGuide = (id: OnboardingStepId) => {
    const href = guideHref(id);
    if (href) navigate(href);
  };
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  /**
   * 既定で畳んでいたのは、この一覧が /my-room にあった頃に部屋とアバターを
   * 画面の上に出しておきたかったため。いまは /collection にあり、守るべき
   * コンテンツが無い。一方で登録直後のユーザーには1行の進捗バーしか見えず、
   * 次に何をすればいいのか分からない状態だった。
   *
   * - 既定は畳む。畳んでいる間も「次にやること」を1件だけ見せる
   * - ユーザーが自分で開閉したら、その選択を以後優先する
   *
   * null = まだ決まっていない（localStorage と進捗を読んでから確定させる）
   */
  const [expandPref, setExpandPref] = useState<boolean | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check dismissed + remembered expand state from localStorage
  useEffect(() => {
    if (user?.id) {
      const dismissed = localStorage.getItem(`checklist_dismissed_${user.id}`);
      if (dismissed) setIsDismissed(true);
      const expanded = localStorage.getItem(`checklist_expanded_${user.id}`);
      if (expanded === 'true') setExpandPref(true);
      else if (expanded === 'false') setExpandPref(false);
    }
  }, [user?.id]);

  // Toggle expand/collapse and persist the user's preference.
  const handleToggleExpand = () => {
    setExpandPref((prev) => {
      // 初回は「いま見えている状態」の反対に倒す。
      const next = !(prev ?? isExpanded);
      if (user?.id) {
        localStorage.setItem(`checklist_expanded_${user.id}`, String(next));
      }
      return next;
    });
  };

  // Fetch user data for checklist status
  const { data: checklistData } = useQuery({
    queryKey: ['onboarding-checklist', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const [
        profileRes,
        itemsRes,
        avatarRes,
        roomRes,
        wishlistRes,
        followsRes,
        bookmarksRes,
        tradeOfferRes,
        rewardsRes,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('avatar_url, bio, display_name, username, favorite_item_ids')
          .eq('id', user.id)
          .single(),
        // 件数も使う（お気に入りの達成条件が「5つ、持っているのが5つ未満なら持っている数」なので）
        supabase.from('user_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        // プロフィール写真のアップロードも avatar_gallery に入るので、AI で作ったものだけ数える（サーバーの判定と同じ）
        supabase
          .from('avatar_gallery')
          .select('id')
          .eq('user_id', user.id)
          .or('prompt.is.null,prompt.not.in.("プロフィール画像","アップロード画像")')
          .limit(1),
        supabase.from('ai_generated_rooms').select('id').eq('user_id', user.id).limit(1),
        supabase.from('wishlists').select('id').eq('user_id', user.id).limit(1),
        supabase.from('follows').select('id').eq('follower_id', user.id).limit(1),
        supabase.from('ai_work_bookmarks').select('id').eq('user_id', user.id).limit(1),
        supabase
          .from('user_items')
          .select('id')
          .eq('user_id', user.id)
          .eq('for_trade', true)
          .limit(1),
        supabase.from('onboarding_rewards').select('step_id').eq('user_id', user.id),
      ]);

      const profile = profileRes.data;
      const claimedSteps = new Set((rewardsRes.data ?? []).map((r) => r.step_id));
      const favCount = (profile?.favorite_item_ids as string[] | null)?.length ?? 0;
      const itemCount = itemsRes.count ?? 0;

      return {
        // 登録時に display_name へユーザー名が入るので、それだけでは達成にしない（サーバーの判定と同じ）
        hasProfile: !!(
          profile?.avatar_url ||
          profile?.bio ||
          (profile?.display_name && profile.display_name !== profile.username)
        ),
        hasItem: itemCount > 0,
        // 5つ選ぶ。持っているグッズが5つ未満なら、持っている数だけ選べば達成（サーバーの判定と同じ）
        hasFavorites5: favCount >= Math.max(1, Math.min(5, itemCount)),
        hasAvatar: (avatarRes.data?.length ?? 0) > 0,
        hasAiRoom: (roomRes.data?.length ?? 0) > 0,
        hasWishlist: (wishlistRes.data?.length ?? 0) > 0,
        hasFollow: (followsRes.data?.length ?? 0) > 0,
        hasBookmark: (bookmarksRes.data?.length ?? 0) > 0,
        hasTradeOffer: (tradeOfferRes.data?.length ?? 0) > 0,
        claimedSteps,
      };
    },
    // 小さくしている間も進み具合を出すので、取得は続ける
    enabled: !!user?.id,
    // 達成したらすぐ完了の印を付けたいので、長くは持たない（画面に戻るたびに読み直す）
    staleTime: 1000 * 15,
    refetchOnWindowFocus: true,
  });

  const items: ChecklistItem[] = useMemo(() => {
    if (!checklistData || !user?.id) return [];
    return [
      // 🎯 はじめの一歩
      {
        id: 'account',
        labelKey: 'misc.checklist.accountLabel',
        descriptionKey: 'misc.checklist.accountDesc',
        icon: CheckCircle2,
        completed: true,
        points: ONBOARDING_STEP_POINTS['account'],
        group: 'start',
      },
      {
        id: 'profile',
        labelKey: 'misc.checklist.profileLabel',
        descriptionKey: 'misc.checklist.profileDesc',
        icon: User,
        completed: checklistData.hasProfile,
        action: () => goGuide('profile'),
        points: ONBOARDING_STEP_POINTS['profile'],
        group: 'start',
      },
      // 📦 コレクション
      {
        id: 'first-item',
        labelKey: 'misc.checklist.firstItemLabel',
        descriptionKey: 'misc.checklist.firstItemDesc',
        icon: Package,
        completed: checklistData.hasItem,
        action: () => goGuide('first-item'),
        points: ONBOARDING_STEP_POINTS['first-item'],
        group: 'collection',
      },
      {
        id: 'favorites',
        labelKey: 'misc.checklist.favoritesLabel',
        descriptionKey: 'misc.checklist.favoritesDesc',
        icon: Star,
        completed: checklistData.hasFavorites5,
        action: () => goGuide('favorites'),
        points: ONBOARDING_STEP_POINTS['favorites'],
        group: 'collection',
      },
      {
        id: 'wishlist',
        labelKey: 'misc.checklist.wishlistLabel',
        descriptionKey: 'misc.checklist.wishlistDesc',
        icon: Heart,
        completed: checklistData.hasWishlist,
        action: () => goGuide('wishlist'),
        points: ONBOARDING_STEP_POINTS['wishlist'],
        group: 'collection',
      },
      // 🎨 AIスタジオ
      {
        id: 'ai-room',
        labelKey: 'misc.checklist.aiRoomLabel',
        descriptionKey: 'misc.checklist.aiRoomDesc',
        icon: Home,
        completed: checklistData.hasAiRoom,
        action: () => goGuide('ai-room'),
        points: ONBOARDING_STEP_POINTS['ai-room'],
        freeTrial: true,
        group: 'ai',
      },
      {
        id: 'avatar',
        labelKey: 'misc.checklist.avatarLabel',
        descriptionKey: 'misc.checklist.avatarDesc',
        icon: UserCircle2,
        completed: checklistData.hasAvatar,
        action: () => goGuide('avatar'),
        points: ONBOARDING_STEP_POINTS['avatar'],
        freeTrial: true,
        group: 'ai',
      },
      // 🌐 コミュニティ
      {
        id: 'follow',
        labelKey: 'misc.checklist.followLabel',
        descriptionKey: 'misc.checklist.followDesc',
        icon: Users,
        completed: checklistData.hasFollow,
        action: () => goGuide('follow'),
        points: ONBOARDING_STEP_POINTS['follow'],
        group: 'community',
      },
      {
        // 交換は「出すものを選ぶ」をやらないと一生マッチしない。
        // 本番の user_items 254件が全件 for_trade=false だったので、
        // ここに置いて最初の1件を出してもらう。
        id: 'trade-offer',
        labelKey: 'misc.checklist.tradeOfferLabel',
        descriptionKey: 'misc.checklist.tradeOfferDesc',
        icon: ArrowLeftRight,
        completed: checklistData.hasTradeOffer,
        action: () => goGuide('trade-offer'),
        points: ONBOARDING_STEP_POINTS['trade-offer'],
        group: 'community',
      },
      {
        id: 'bookmark',
        labelKey: 'misc.checklist.bookmarkLabel',
        descriptionKey: 'misc.checklist.bookmarkDesc',
        icon: Compass,
        completed: checklistData.hasBookmark,
        action: () => goGuide('bookmark'),
        points: ONBOARDING_STEP_POINTS['bookmark'],
        group: 'community',
      },
    ];
  }, [checklistData, navigate, user?.id]);

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = completedCount === totalCount;
  /** 畳んでいる間に見せる「次にやること」。一覧の並び順がそのまま推奨順。 */
  const nextItem = items.find((i) => !i.completed);
  const nextReward = nextItem?.points ?? 0;

  // 序盤は開いて出す。アカウント作成だけ済んだ状態で畳むと、
  // 進捗バー1行しか見えず次の行動が分からない。
  // 既定は畳む（1行の「次にやること」だけ）。開いたままだとコレクションの最初の画面がガイドで埋まり、グッズが1つも見えなかった
  const isExpanded = expandPref ?? false;

  // グループ化
  const groupedItems = useMemo(() => {
    const groups: Record<ChecklistItem['group'], ChecklistItem[]> = {
      start: [],
      collection: [],
      ai: [],
      community: [],
    };
    items.forEach((item) => groups[item.group].push(item));
    return groups;
  }, [items]);

  // 報酬の付与は OnboardingRewardWatcher（アプリ全体で常に動く）が持つ。
  // 以前はここで付与していたため、この一覧が画面に出ていて、しかもキャッシュが新しくなるまで
  // 達成しても報酬が出なかった（プロフィールを保存しても +20pt がもらえない、など）。

  // × は「消す」ではなく「小さくする」。以前は × を押すと二度と出せなかった
  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(`checklist_dismissed_${user.id}`, 'true');
    }
    setIsDismissed(true);
  };

  const handleRestore = () => {
    if (user?.id) {
      localStorage.removeItem(`checklist_dismissed_${user.id}`);
    }
    setIsDismissed(false);
  };

  if (!checklistData || allCompleted) return null;

  if (isDismissed) {
    return (
      <button
        type="button"
        onClick={handleRestore}
        data-tour="collection-checklist"
        className="flex w-full items-center gap-2 rounded-xl border border-primary/20 bg-card px-3 py-2 text-left transition-colors hover:bg-accent"
        aria-label={t('misc.checklist.restore')}
      >
        <span className="rounded-lg bg-brand-gradient p-1">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-bold">{t('misc.checklist.title')}</span>
        <span className="text-2xs tabular-nums text-muted-foreground">
          {completedCount}/{totalCount}
        </span>
        {nextReward > 0 && (
          <span className="rounded-full bg-points-soft px-1.5 py-0.5 text-3xs font-bold tabular-nums text-points">
            +{nextReward}pt
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <motion.div
      data-tour="collection-checklist"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm overflow-hidden">
        <CardContent className={isExpanded ? "p-4 space-y-3" : "p-3 space-y-2"}>
          {/* Header (tap anywhere to expand/collapse) */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleToggleExpand}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? t('misc.checklist.close') : t('misc.checklist.open')}
              className="flex items-center gap-2 flex-1 min-w-0 text-left rounded-lg -m-1 p-1 transition-colors hover:bg-muted/40"
            >
              <div className="p-1.5 rounded-lg bg-brand-gradient shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
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
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
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

          {/* Progress（畳んでいるときはバーだけにして高さを抑える） */}
          <div className="space-y-1.5">
            <Progress value={progress} className={isExpanded ? "h-2" : "h-1.5"} />
            {isExpanded && <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {t('misc.checklist.stepsLeft', { n: totalCount - completedCount })}
              </span>
              <span className="text-primary font-medium flex items-center gap-1">
                <Gift className="w-3 h-3" />
                {nextReward > 0
                  ? t('misc.checklist.nextReward', { n: nextReward })
                  : t('misc.checklist.hasReward')}
              </span>
            </div>}
          </div>

          {/* 畳んでいるときの「次にやること」。
              以前はここが進捗バーだけで、登録直後のユーザーには
              何をすればいいのかが一切見えていなかった。 */}
          {!isExpanded && nextItem && (
            <button
              type="button"
              onClick={nextItem.action}
              disabled={!nextItem.action}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors text-left disabled:cursor-default"
            >
              <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                <nextItem.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-3xs font-bold text-primary uppercase tracking-wider">
                  {t('misc.checklist.nextUp')}
                </p>
                <p className="text-sm font-medium truncate">{t(nextItem.labelKey)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs font-bold tabular-nums text-points bg-points-soft px-2 py-0.5 rounded-full">
                  +{nextItem.points}pt
                </span>
                {nextItem.action && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>
          )}

          {/* Items grouped */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 overflow-hidden"
              >
                {(Object.keys(groupedItems) as ChecklistItem['group'][]).map((groupKey) => {
                  const groupItems = groupedItems[groupKey];
                  if (groupItems.length === 0) return null;
                  const meta = GROUP_META[groupKey];
                  const GroupIcon = meta.icon;
                  const groupCompleted = groupItems.filter((i) => i.completed).length;
                  return (
                    <div key={groupKey} className="space-y-1.5">
                      {/* Group header */}
                      <div className="flex items-center gap-1.5 px-1">
                        <GroupIcon className={`w-3.5 h-3.5 ${meta.color}`} />
                        <span className="text-2xs font-bold text-foreground/80 uppercase tracking-wider">
                          {t(meta.labelKey)}
                        </span>
                        <span className="text-3xs text-muted-foreground ml-auto">
                          {groupCompleted}/{groupItems.length}
                        </span>
                      </div>
                      {/* Group items */}
                      <div className="space-y-1.5">
                        {groupItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id}
                              onClick={item.completed ? undefined : item.action}
                              disabled={item.completed}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                                item.completed
                                  ? 'bg-primary/5 opacity-60'
                                  : 'bg-muted/30 hover:bg-muted/60 cursor-pointer'
                              }`}
                            >
                              {item.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                              ) : (
                                <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p
                                    className={`text-sm font-medium ${
                                      item.completed ? 'line-through text-muted-foreground' : ''
                                    }`}
                                  >
                                    {t(item.labelKey)}
                                  </p>
                                  {!item.completed && item.freeTrial && (
                                    <span className="text-3xs font-bold text-points bg-points-soft px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                      <Gift className="w-2.5 h-2.5" />
                                      {t('misc.common.freeFirstTime')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {t(item.descriptionKey)}
                                </p>
                              </div>
                              {item.completed ? (
                                <span className="text-xs font-medium text-primary bg-primary/15 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3" />
                                  +{item.points}pt
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                                  +{item.points}pt
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
