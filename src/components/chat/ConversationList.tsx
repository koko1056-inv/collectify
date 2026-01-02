import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { ChatModal } from "./ChatModal";
import { MessageCircle } from "lucide-react";

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerUsername: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  tradeRequestId?: string;
}

export function ConversationList() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
      subscribeToMessages();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      // 自分が送受信したメッセージを取得
      const { data: messages, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          created_at,
          is_read,
          sender_id,
          receiver_id,
          trade_request_id
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 会話相手ごとにグループ化
      const conversationMap = new Map<string, {
        lastMessage: typeof messages[0];
        unreadCount: number;
        tradeRequestId?: string;
      }>();

      messages?.forEach((msg) => {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const key = msg.trade_request_id ? `${partnerId}-${msg.trade_request_id}` : partnerId;

        if (!conversationMap.has(key)) {
          conversationMap.set(key, {
            lastMessage: msg,
            unreadCount: 0,
            tradeRequestId: msg.trade_request_id || undefined,
          });
        }

        // 未読カウント
        if (msg.receiver_id === user.id && !msg.is_read) {
          const conv = conversationMap.get(key)!;
          conv.unreadCount++;
        }
      });

      // パートナーのプロフィールを取得
      const partnerIds = [...new Set(
        [...conversationMap.keys()].map(key => key.split('-')[0])
      )];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", partnerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // 会話リストを作成
      const convList: Conversation[] = [];
      conversationMap.forEach((conv, key) => {
        const partnerId = key.split('-')[0];
        const profile = profileMap.get(partnerId);

        if (profile) {
          convList.push({
            partnerId,
            partnerName: profile.display_name || profile.username,
            partnerUsername: profile.username,
            partnerAvatar: profile.avatar_url,
            lastMessage: conv.lastMessage.content,
            lastMessageTime: conv.lastMessage.created_at,
            unreadCount: conv.unreadCount,
            tradeRequestId: conv.tradeRequestId,
          });
        }
      });

      // 最新メッセージ順にソート
      convList.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      setConversations(convList);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("messages-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user?.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${user?.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleConversationClick = (conv: Conversation) => {
    setSelectedConversation(conv);
  };

  const handleCloseChat = () => {
    setSelectedConversation(null);
    fetchConversations(); // 閉じた後に未読を更新
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-14 w-14 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-3 w-40 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">メッセージはありません</p>
        <p className="text-sm">他のユーザーとメッセージを交換しましょう</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-background">
        <div className="px-4 py-3 border-b">
          <h1 className="text-xl font-bold">メッセージ</h1>
        </div>
        
        <div className="divide-y">
          {conversations.map((conv) => (
            <button
              key={`${conv.partnerId}-${conv.tradeRequestId || 'dm'}`}
              onClick={() => handleConversationClick(conv)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="relative">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={conv.partnerAvatar || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {conv.partnerName[0]}
                  </AvatarFallback>
                </Avatar>
                {conv.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                  </span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-medium truncate ${conv.unreadCount > 0 ? 'text-foreground' : 'text-foreground/80'}`}>
                    {conv.partnerName}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(conv.lastMessageTime), { 
                      addSuffix: true, 
                      locale: ja 
                    })}
                  </span>
                </div>
                <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {conv.lastMessage}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedConversation && (
        <ChatModal
          isOpen={!!selectedConversation}
          onClose={handleCloseChat}
          partnerId={selectedConversation.partnerId}
          tradeRequestId={selectedConversation.tradeRequestId}
        />
      )}
    </>
  );
}
