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
  Circle,
  User,
  Package,
  Image as ImageIcon,
  Star,
  Home,
  UserCircle2,
  ChevronDown,
  ChevronUp,
  Gift,
  Sparkles,
  X,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  completed: boolean;
  action?: () => void;
  points: number;
  freeTrial?: boolean;
}

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

      const [profileRes, itemsRes, postsRes, avatarRes, roomRes, rewardsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('avatar_url, bio, display_name, favorite_item_ids')
          .eq('id', user.id)
          .single(),
        supabase.from('user_items').select('id').eq('user_id', user.id).limit(1),
        supabase.from('goods_posts').select('id').eq('user_id', user.id).limit(1),
        supabase.from('avatar_gallery').select('id').eq('user_id', user.id).limit(1),
        supabase.from('ai_generated_rooms').select('id').eq('user_id', user.id).limit(1),
        supabase.from('onboarding_rewards').select('step_id').eq('user_id', user.id),
      ]);

      const profile = profileRes.data;
      const claimedSteps = new Set((rewardsRes.data ?? []).map((r) => r.step_id));
      return {
        hasProfile: !!(profile?.avatar_url || profile?.bio || profile?.display_name),
        hasItem: (itemsRes.data?.length ?? 0) > 0,
        hasPost: (postsRes.data?.length ?? 0) > 0,
        hasFavorites: ((profile?.favorite_item_ids as string[] | null)?.length ?? 0) > 0,
        hasAvatar: (avatarRes.data?.length ?? 0) > 0,
        hasAiRoom: (roomRes.data?.length ?? 0) > 0,
        claimedSteps,
      };
    },
    enabled: !!user?.id && !isDismissed,
    staleTime: 1000 * 60 * 5,
  });

  const items: ChecklistItem[] = useMemo(() => {
    if (!checklistData || !user?.id) return [];
    return [
      {
        id: 'account',
        label: 'アカウント作成',
        description: '完了済み！',
        icon: CheckCircle2,
        completed: true,
        points: 10,
      },
      {
        id: 'profile',
        label: 'プロフィール設定',
        description: 'アバターや自己紹介を追加',
        icon: User,
        completed: checklistData.hasProfile,
        action: () => navigate('/edit-profile'),
        points: 20,
      },
      {
        id: 'first-item',
        label: '最初のグッズ登録',
        description: 'コレクションに追加しよう',
        icon: Package,
        completed: checklistData.hasItem,
        action: () => navigate('/search'),
        points: 30,
      },
      {
        id: 'favorites',
        label: 'お気に入りを5個登録',
        description: 'TOP5を他の人にも見せよう',
        icon: Star,
        completed: checklistData.hasFavorites,
        action: () => navigate(`/?userId=${user.id}`),
        points: 20,
      },
      {
        id: 'ai-room',
        label: 'AIでルームを作る',
        description: 'グッズで推し部屋を生成',
        icon: Home,
        completed: checklistData.hasAiRoom,
        action: () => navigate('/ai-rooms'),
        points: 30,
        freeTrial: true,
      },
      {
        id: 'avatar',
        label: 'アバターを作る',
        description: 'AIで自分の分身をつくろう',
        icon: UserCircle2,
        completed: checklistData.hasAvatar,
        action: () => navigate('/my-room?tab=avatar'),
        points: 30,
        freeTrial: true,
      },
      {
        id: 'first-post',
        label: '最初の投稿',
        description: 'グッズの写真を投稿しよう',
        icon: ImageIcon,
        completed: checklistData.hasPost,
        action: () => navigate('/posts'),
        points: 20,
      },
    ];
  }, [checklistData, navigate, user?.id]);

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = completedCount === totalCount;

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
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm">はじめの{totalCount}ステップ</h3>
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

          {/* Items */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-1.5 overflow-hidden"
              >
                {items.map((item) => {
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
                          <p className={`text-sm font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
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
                      {!item.completed && (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                          +{item.points}pt
                        </span>
                      )}
                    </button>
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
