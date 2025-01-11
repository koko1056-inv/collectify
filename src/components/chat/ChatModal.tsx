import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInputForm } from "./ChatInputForm";
import { useChatMessages } from "@/hooks/chat/useChatMessages";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerId: string;
  tradeRequestId?: string;
}

export function ChatModal({ isOpen, onClose, partnerId, tradeRequestId }: ChatModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCompleting, setIsCompleting] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState<{ username: string; display_name: string | null } | null>(null);
  const { messages, fetchMessages, markMessagesAsRead } = useChatMessages(isOpen, user, partnerId, tradeRequestId);

  useEffect(() => {
    if (isOpen && user) {
      fetchPartnerProfile();
    }
  }, [isOpen, user, partnerId]);

  const fetchPartnerProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", partnerId)
      .single();

    if (!error && data) {
      setPartnerProfile(data);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!user) return;

    const messageData = {
      sender_id: user.id,
      receiver_id: partnerId,
      content: content,
      trade_request_id: tradeRequestId
    };

    const { error } = await supabase.from("messages").insert(messageData);

    if (!error) {
      await markMessagesAsRead();
      fetchMessages();
    }
  };

  const handleComplete = async () => {
    if (!tradeRequestId) return;
    
    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from("trade_requests")
        .update({ status: "completed" })
        .eq("id", tradeRequestId);

      if (error) {
        throw error;
      }

      toast({
        title: "トレード完了",
        description: "トレードが完了しました。お疲れ様でした！",
      });
      onClose();
    } catch (error) {
      console.error("Error completing trade:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "トレードの完了に失敗しました。",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {partnerProfile ? partnerProfile.display_name || partnerProfile.username : "チャット"}とのチャット
          </DialogTitle>
        </DialogHeader>
        <ChatMessageList messages={messages} userId={user?.id} />
        <ChatInputForm 
          onSendMessage={handleSendMessage}
          onComplete={handleComplete}
          isCompleting={isCompleting}
          showCompleteButton={!!tradeRequestId}
        />
      </DialogContent>
    </Dialog>
  );
}