import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerId: string;
  tradeRequestId?: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

export function ChatModal({ isOpen, onClose, partnerId, tradeRequestId }: ChatModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [partnerProfile, setPartnerProfile] = useState<{ username: string; display_name: string | null } | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchMessages();
      fetchPartnerProfile();
      subscribeToMessages();
    }
  }, [isOpen, user, partnerId, tradeRequestId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const markMessagesAsRead = async () => {
    if (!user) return;

    let query = supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    if (tradeRequestId) {
      query = query.eq("trade_request_id", tradeRequestId);
    } else {
      query = query.eq("sender_id", partnerId).is("trade_request_id", null);
    }

    await query;
  };

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

  const fetchMessages = async () => {
    if (!user) return;

    let query = supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .or(`sender_id.eq.${partnerId},receiver_id.eq.${partnerId}`);

    if (tradeRequestId) {
      query = query.eq('trade_request_id', tradeRequestId);
    }

    query = query.order("created_at", { ascending: true });

    const { data, error } = await query;

    if (!error && data) {
      setMessages(data);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: tradeRequestId 
            ? `trade_request_id=eq.${tradeRequestId}`
            : `sender_id=eq.${partnerId},receiver_id=eq.${user?.id}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    const messageData = {
      sender_id: user.id,
      receiver_id: partnerId,
      content: newMessage.trim(),
      trade_request_id: tradeRequestId
    };

    const { error } = await supabase.from("messages").insert(messageData);

    if (!error) {
      setNewMessage("");
      await markMessagesAsRead();
      fetchMessages();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
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
        <ScrollArea ref={scrollRef} className="flex-1 px-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_id === user?.id ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.sender_id === user?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="メッセージを入力..."
              className="flex-1"
            />
            <Button onClick={handleSendMessage} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {tradeRequestId && (
            <Button 
              onClick={handleComplete} 
              disabled={isCompleting}
              className="w-full"
              variant="secondary"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              トレードを完了する
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
