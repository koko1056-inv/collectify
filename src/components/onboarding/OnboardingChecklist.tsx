import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  Gift,
  Sparkles,
  X,
  Heart,
  Users,
  Wand2,
  Compass,
  type LucideIcon,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  completed: boolean;
  action?: () => void;
  points: number;
  freeTrial?: boolean;
  group: 'start' | 'collection' | 'ai' | 'community';
}

const GROUP_META: Record<ChecklistItem['group'], { label: string; icon: LucideIcon; color: string }> = {
  start: { label: 'はじめの一歩', icon: Sparkles, color: 'text-amber-500' },
  collection: { label: 'コレクション', icon: Package, color: 'text-emerald-500' },
  ai: { label: 'AIスタジオ', icon: Wand2, color: 'text-fuchsia-500' },
  community: { label: 'コミュニティ', icon: Users, color: 'text-blue-500' },
};

export function OnboardingChecklist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const claimingRef = useRef<Set<string>>(new Set());

  // Check if dismissed from localStorage
  useEffect(() => {
    if (user?.id) {
      const dismissed = localStorage.getItem(`checklist_dismissed_${user.id}`);
      if (dismissed) setIsDismissed(true);
    }
  }, [user?.id]);

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
        rewardsRes,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('avatar_url, bio, display_name, favorite_item_ids')
          .eq('id', user.id)
          .single(),
        supabase.from('user_items').select('id').eq('user_id', user.id).limit(1),
        supabase.from('avatar_gallery').select('id').eq('user_id', user.id).limit(1),
        supabase.from('ai_generated_rooms').select('id').eq('user_id', user.id).limit(1),
        supabase.from('wishlists').select('id').eq('user_id', user.id).limit(1),
        supabase.from('follows').select('id').eq('follower_id', user.id).limit(1),
        supabase.from('ai_work_bookmarks').select('id').eq('user_id', user.id).limit(1),
        supabase.from('onboarding_rewards').select('step_id').eq('user_id', user.id),
      ]);

      const profile = profileRes.data;
      const claimedSteps = new Set((rewardsRes.data ?? []).map((r) => r.step_id));
      const favCount = (profile?.favorite_item_ids as string[] | null)?.length ?? 0;

      return {
        hasProfile: !!(profile?.avatar_url || profile?.bio || profile?.display_name),
        hasItem: (itemsRes.data?.length ?? 0) > 0,
        hasFavorites5: favCount >= 5,
        hasAvatar: (avatarRes.data?.length ?? 0) > 0,
        hasAiRoom: (roomRes.data?.length ?? 0) > 0,
        hasWishlist: (wishlistRes.data?.length ?? 0) > 0,
        hasFollow: (followsRes.data?.length ?? 0) > 0,
        hasBookmark: (bookmarksRes.data?.length ?? 0) > 0,
        claimedSteps,
      };
    },
    enabled: !!user?.id && !isDismissed,
    staleTime: 1000 * 60 * 5,
  });

  const items: ChecklistItem[] = useMemo(() => {
    if (!checklistData || !user?.id) return [];
    return [
      // 🎯 はじめの一歩
      {
        id: 'account',
        label: 'アカウント作成',
        description: '完了済み！',
        icon: CheckCircle2,
        completed: true,
        points: 10,
        group: 'start',
      },
      {
        id: 'profile',
        label: 'プロフィール設定',
        description: 'アバターや自己紹介を追加',
        icon: User,
        completed: checklistData.hasProfile,
        action: () => navigate('/edit-profile'),
        points: 20,
        group: 'start',
      },
      // 📦 コレクション
      {
        id: 'first-item',
        label: '最初のグッズ登録',
        description: 'コレクションに追加しよう',
        icon: Package,
        completed: checklistData.hasItem,
        action: () => navigate('/search'),
        points: 30,
        group: 'collection',
      },
      {
        id: 'favorites',
        label: 'お気に入りTOP5を選ぶ',
        description: 'プロフィールを彩ろう',
        icon: Star,
        completed: checklistData.hasFavorites5,
        action: () => navigate('/collection'),
        points: 20,
        group: 'collection',
      },
      {
        id: 'wishlist',
        label: 'ウィッシュリストに追加',
        description: '欲しいグッズをハートで保存',
        icon: Heart,
        completed: checklistData.hasWishlist,
        action: () => navigate('/search'),
        points: 10,
        group: 'collection',
      },
      // 🎨 AIスタジオ
      {
        id: 'ai-room',
        label: 'AIで推し部屋を作る',
        description: 'グッズで世界に一つの空間を生成',
        icon: Home,
        completed: checklistData.hasAiRoom,
        action: () => navigate('/ai-rooms'),
        points: 30,
        freeTrial: true,
        group: 'ai',
      },
      {
        id: 'avatar',
        label: 'AIアバターを作る',
        description: '自分だけの分身を生成',
        icon: UserCircle2,
        completed: checklistData.hasAvatar,
        action: () => navigate('/my-room?tab=avatar'),
        points: 30,
        freeTrial: true,
        group: 'ai',
      },
      // 🌐 コミュニティ
      {
        id: 'follow',
        label: '誰かをフォロー',
        description: '気になるコレクターを見つけよう',
        icon: Users,
        completed: checklistData.hasFollow,
        action: () => navigate('/explore'),
        points: 10,
        group: 'community',
      },
      {
        id: 'bookmark',
        label: 'AI作品を保存',
        description: 'お気に入りの推し部屋をブックマーク',
        icon: Compass,
        completed: checklistData.hasBookmark,
        action: () => navigate('/explore'),
        points: 10,
        group: 'community',
      },
    ];
  }, [checklistData, navigate, user?.id]);

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = completedCount === totalCount;

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

  // 自動報酬付与
  useEffect(() => {
    if (!user?.id || !checklistData) return;
    const claimedSteps =
      checklistData.claimedSteps instanceof Set
        ? checklistData.claimedSteps
        : new Set<string>(
            Array.isArray(checklistData.claimedSteps)
              ? (checklistData.claimedSteps as string[])
              : []
          );

    const toClaim = items.filter(
      (i) => i.completed && i.points > 0 && !claimedSteps.has(i.id) && !claimingRef.current.has(i.id)
    );
    if (toClaim.length === 0) return;

    (async () => {
      for (const item of toClaim) {
        claimingRef.current.add(item.id);
        try {
          const { data, error } = await supabase.rpc('claim_onboarding_reward', {
            _step_id: item.id,
            _points: item.points,
          });
          if (error) {
            console.error('[OnboardingChecklist] claim error:', error);
            claimingRef.current.delete(item.id);
            continue;
          }
          if (data === true) {
            toast({
              title: `🎉 ${item.label} 達成！`,
              description: `+${item.points}pt をゲットしました`,
            });
          }
        } catch (e) {
          console.error('[OnboardingChecklist] claim exception:', e);
          claimingRef.current.delete(item.id);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['onboarding-checklist', user.id] });
      queryClient.invalidateQueries({ queryKey: ['userPoints'] });
      queryClient.invalidateQueries({ queryKey: ['pointTransactions'] });
    })();
  }, [items, checklistData, user?.id, queryClient, toast]);

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(`checklist_dismissed_${user.id}`, 'true');
    }
    setIsDismissed(true);
  };

  if (isDismissed || !checklistData || allCompleted) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-lg overflow-hidden">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">推し活はじめてガイド</h3>
                <p className="text-xs text-muted-foreground">
                  {completedCount}/{totalCount} 完了
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsExpanded(!isExpanded)}
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
                className="h-7 w-7 text-muted-foreground"
                onClick={handleDismiss}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                あと{totalCount - completedCount}ステップ
              </span>
              <span className="text-primary font-medium flex items-center gap-1">
                <Gift className="w-3 h-3" />
                報酬あり
              </span>
            </div>
          </div>

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
                        <span className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
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
                                <Icon className="w-5 h-5 text-muted-foreground/60 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p
                                    className={`text-sm font-medium ${
                                      item.completed ? 'line-through text-muted-foreground' : ''
                                    }`}
                                  >
                                    {item.label}
                                  </p>
                                  {!item.completed && item.freeTrial && (
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                      <Gift className="w-2.5 h-2.5" />
                                      初回無料
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {item.description}
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
