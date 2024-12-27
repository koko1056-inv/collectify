import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";

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
  currentUserId: string;
}

export function ChatMessageList({ messages, currentUserId }: ChatMessageListProps) {
  return (
    <ScrollArea className="flex-1 pr-4">
      <div className="space-y-4">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            content={msg.content}
            isOwnMessage={msg.sender_id === currentUserId}
            profileData={msg.profiles}
          />
        ))}
      </div>
    </ScrollArea>
  );
}