import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from '@/types/notification';
import { toast } from "sonner";
import { useLanguage } from '@/contexts/LanguageContext';

export function useNotifications() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  // 購読（リアルタイム）の中で使う翻訳。言語を変えるたびに購読し直さないよう ref で最新を読む
  const tRef = useRef(t);
  tRef.current = t;

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast.error(t('notices.common.errorTitle'), {
        description: t('notices.notifications.updateFailed'),
      });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not found');
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast.error(t('notices.common.errorTitle'), {
        description: t('notices.notifications.updateFailed'),
      });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast.error(t('notices.common.errorTitle'), {
        description: t('notices.notifications.deleteFailed'),
      });
    },
  });

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Show toast for new notification
          if (newNotification.type === 'oshi_room_like') {
            // 推しの部屋へのいいね: いまの言語で出し、部屋のいいねの数・一覧も取り直す
            const name = (newNotification.data as { actor_name?: string | null } | null)?.actor_name;
            const tr = tRef.current;
            toast(tr('oshiRoom.social.notify.title'), {
              description: tr('oshiRoom.social.notify.message', { name: name || tr('oshiRoom.social.notify.someone') }),
              duration: 5000,
            });
            queryClient.invalidateQueries({ queryKey: ['oshi-room-likes', user.id] });
            queryClient.invalidateQueries({ queryKey: ['oshi-room-likers', user.id] });
          } else {
            toast(newNotification.title, {
              description: newNotification.message,
              duration: 5000,
            });
          }

          // Update query cache
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeletingNotification: deleteNotificationMutation.isPending,
  };
}