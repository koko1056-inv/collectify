import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export function ChatModal({ isOpen, onClose, recipientId, recipientName }: ChatModalProps) {
  const [message, setMessage] = useState("");
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

    // Subscribe to new messages
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

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
      return;
    }

    setMessage("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{recipientName}とのチャット</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-[400px]">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 ${
                    msg.sender_id === user?.id ? "flex-row-reverse" : ""
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.profiles?.avatar_url || ""} />
                    <AvatarFallback>
                      {msg.profiles?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`rounded-lg px-3 py-2 max-w-[80%] ${
                      msg.sender_id === user?.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <form onSubmit={handleSendMessage} className="flex gap-2 mt-4">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="メッセージを入力..."
              className="flex-1"
            />
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}