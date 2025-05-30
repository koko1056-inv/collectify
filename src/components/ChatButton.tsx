import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChatModal } from "@/components/chat/ChatModal";
export function ChatButton() {
  const {
    user
  } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  useEffect(() => {
    if (user) {
      fetchUnreadMessages();
      subscribeToMessages();
    }
  }, [user]);
  const fetchUnreadMessages = async () => {
    if (!user) return;
    const {
      count,
      error
    } = await supabase.from("messages").select("*", {
      count: "exact",
      head: true
    }).eq("receiver_id", user.id).eq("is_read", false);
    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };
  const subscribeToMessages = () => {
    const channel = supabase.channel("chat-notification").on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `receiver_id=eq.${user?.id}`
    }, payload => {
      fetchUnreadMessages();
      // 最新のメッセージの送信者IDを取得して、モーダルを開いた時に会話できるようにする
      if (payload.new && payload.new.sender_id) {
        setPartnerId(payload.new.sender_id as string);
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  };
  const handleOpenChat = () => {
    setIsOpen(true);
  };
  return <>
      

      {partnerId && <ChatModal isOpen={isOpen} onClose={() => {
      setIsOpen(false);
      // モーダルを閉じた後に未読メッセージの数を更新
      fetchUnreadMessages();
    }} partnerId={partnerId} />}
    </>;
}