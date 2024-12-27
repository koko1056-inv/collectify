import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatMessageProps {
  content: string;
  isOwnMessage: boolean;
  profileData: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export function ChatMessage({ content, isOwnMessage, profileData }: ChatMessageProps) {
  return (
    <div
      className={`flex items-start gap-2 ${
        isOwnMessage ? "flex-row-reverse" : ""
      }`}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={profileData?.avatar_url || ""} />
        <AvatarFallback>
          {profileData?.username?.[0]?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      <div
        className={`rounded-lg px-3 py-2 max-w-[80%] ${
          isOwnMessage
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        <p className="text-sm">{content}</p>
      </div>
    </div>
  );
}