import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";
import { MessageItem } from "./MessageItem";
import type { Message, PartnerProfile } from "./types";
import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { EmptyState } from "@/components/ui/empty-state";

interface MessageListProps {
  messages: Message[];
  partnerProfile?: PartnerProfile | null;
}

export function MessageList({ messages, partnerProfile }: MessageListProps) {
  const { t } = useLanguage();
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
      <EmptyState
        icon={MessageCircle}
        title={t("social.chat.emptyTitle")}
        description={t("social.chat.emptyDesc")}
        className="flex-1 p-8"
      />
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
