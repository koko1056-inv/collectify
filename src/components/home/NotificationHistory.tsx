import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Heart, MessageCircle, Repeat2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

interface NotificationHistoryProps {
  userId: string;
}

export function NotificationHistory({ userId }: NotificationHistoryProps) {
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      // Fetch likes
      const { data: likes } = await supabase
        .from("user_item_likes")
        .select(`
          *,
          user_items (
            title
          ),
          profiles (
            username,
            avatar_url
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch messages
      const { data: messages } = await supabase
        .from("messages")
        .select(`
          *,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq("receiver_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch trade requests
      const { data: trades } = await supabase
        .from("trade_requests")
        .select(`
          *,
          sender:profiles!trade_requests_sender_id_fkey (
            username,
            avatar_url
          )
        `)
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      // Combine and sort all notifications
      const allNotifications = [
        ...(likes || []).map(like => ({
          ...like,
          type: "like",
          created_at: like.created_at,
          profiles: like.profiles,
        })),
        ...(messages || []).map(message => ({
          ...message,
          type: "message",
          created_at: message.created_at,
          profiles: message.profiles,
        })),
        ...(trades || []).map(trade => ({
          ...trade,
          type: "trade",
          created_at: trade.created_at,
          profiles: trade.sender,
        })),
      ].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return allNotifications;
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!notifications.length) {
    return (
      <div className="text-center text-gray-500 py-8">
        新しい通知はありません
      </div>
    );
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-5 w-5 text-red-500" />;
      case "message":
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case "trade":
        return <Repeat2 className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationText = (notification: any) => {
    switch (notification.type) {
      case "like":
        return `${notification.profiles.username}さんがあなたのアイテム「${notification.user_items.title}」にいいねしました`;
      case "message":
        return `${notification.profiles.username}さんからメッセージが届いています`;
      case "trade":
        return `${notification.profiles.username}さんからトレードリクエストが届いています`;
      default:
        return "新しい通知があります";
    }
  };

  return (
    <div className="space-y-4">
      {notifications.map((notification: any) => (
        <Card key={notification.id} className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-sm text-gray-900 truncate">
                {getNotificationText(notification)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(notification.created_at), {
                  addSuffix: true,
                  locale: ja,
                })}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}