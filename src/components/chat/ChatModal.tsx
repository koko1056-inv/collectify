import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function ChatModal({ isOpen, onClose, userId }: ChatModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          profiles:sender_id(username, avatar_url)
        `)
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        throw error;
      }

      return data.map((message) => ({
        ...message,
        profiles: {
          username: message.profiles?.username || null,
          avatar_url: message.profiles?.avatar_url || null,
        },
      }));
    },
    enabled: !!user && isOpen,
  });

  const handleSendMessage = async (content: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("messages").insert({
        content,
        sender_id: user.id,
        receiver_id: userId,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["messages", userId] });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "エラー",
        description: "メッセージの送信に失敗しました",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>メッセージ</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <ChatMessageList messages={messages} />
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={!user || user.id === userId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}