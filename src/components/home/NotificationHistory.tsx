import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NotificationCard } from "./NotificationCard";

export function NotificationHistory() {
  const { user } = useAuth();
  
  const { data: likes = [] } = useQuery({
    queryKey: ["recent-likes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("user_item_likes")
        .select(`
          *,
          user_items!inner(title),
          profiles!user_item_likes_user_id_fkey_profiles(username, avatar_url)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["unread-messages", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          profiles!messages_sender_id_fkey_profiles(username, avatar_url)
        `)
        .eq("receiver_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-4">
      {likes.map((like) => (
        <NotificationCard
          key={like.id}
          type="like"
          username={like.profiles.username}
          avatarUrl={like.profiles.avatar_url}
          itemTitle={like.user_items.title}
          createdAt={like.created_at}
        />
      ))}
      {messages.map((message) => (
        <NotificationCard
          key={message.id}
          type="message"
          username={message.profiles.username}
          avatarUrl={message.profiles.avatar_url}
          content={message.content}
          createdAt={message.created_at}
        />
      ))}
      {likes.length === 0 && messages.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          通知はありません
        </div>
      )}
    </div>
  );
}