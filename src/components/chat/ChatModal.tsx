import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export function ChatModal({ isOpen, onClose, recipientId, recipientName }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          profiles!messages_sender_id_fkey(
            username,
            avatar_url
          )
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      setMessages(data || []);
    };

    fetchMessages();

    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${user.id},receiver_id=eq.${recipientId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, user, recipientId]);

  const handleSendMessage = async (message: string) => {
    if (!user) return;

    const { error } = await supabase.from("messages").insert({
      content: message,
      sender_id: user.id,
      receiver_id: recipientId,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "メッセージの送信に失敗しました",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{recipientName}とのチャット</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-[400px]">
          <ChatMessageList messages={messages} currentUserId={user?.id || ""} />
          <ChatInput onSendMessage={handleSendMessage} />
        </div>
      </DialogContent>
    </Dialog>
  );
}