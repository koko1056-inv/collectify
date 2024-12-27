import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { useEffect, useRef } from "react";

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

interface ChatMessageListProps {
  messages: Message[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ScrollArea ref={scrollRef} className="h-[300px] pr-4">
      <div className="flex flex-col gap-2">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            content={message.content}
            senderId={message.sender_id}
            senderProfile={message.profiles}
            createdAt={message.created_at}
          />
        ))}
      </div>
    </ScrollArea>
  );
}