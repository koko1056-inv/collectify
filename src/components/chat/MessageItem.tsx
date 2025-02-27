
import { useAuth } from "@/contexts/AuthContext";
import type { Message } from "./types";

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const { user } = useAuth();
  const isOwnMessage = message.sender_id === user?.id;

  return (
    <div
      className={`flex ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isOwnMessage
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        <p className="text-sm">{message.content}</p>
      </div>
    </div>
  );
}
