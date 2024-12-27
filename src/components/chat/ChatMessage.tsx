import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface ChatMessageProps {
  content: string;
  senderId: string;
  senderProfile: {
    username: string | null;
    avatar_url: string | null;
  } | null;
  createdAt: string;
}

export function ChatMessage({ content, senderId, senderProfile, createdAt }: ChatMessageProps) {
  const { user } = useAuth();
  const isCurrentUser = user?.id === senderId;

  return (
    <div
      className={cn(
        "flex w-full gap-2 p-2",
        isCurrentUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={senderProfile?.avatar_url || ""} />
        <AvatarFallback>
          {(senderProfile?.username || "User")[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1",
          isCurrentUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-lg px-3 py-2",
            isCurrentUser
              ? "bg-primary text-primary-foreground"
              : "bg-accent text-accent-foreground"
          )}
        >
          <p className="text-sm">{content}</p>
        </div>
        <span className="text-xs text-gray-500">
          {new Date(createdAt).toLocaleString()}
        </span>
      </div>
    </div>
  );
}