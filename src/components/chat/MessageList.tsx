import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";
import { MessageItem } from "./MessageItem";
import type { Message, PartnerProfile } from "./types";
import { MessageCircle } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  partnerProfile?: PartnerProfile | null;
}

export function MessageList({ messages, partnerProfile }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageCircle className="h-8 w-8" />
        </div>
        <p className="text-sm font-medium">メッセージはまだありません</p>
        <p className="text-xs mt-1">最初のメッセージを送ってみましょう</p>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="flex-1 px-3 py-4">
      <div className="space-y-3">
        {messages.map((message, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id;
          
          return (
            <MessageItem 
              key={message.id} 
              message={message} 
              partnerProfile={partnerProfile}
              showAvatar={showAvatar}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
