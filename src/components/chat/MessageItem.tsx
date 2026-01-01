import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import type { Message, PartnerProfile } from "./types";

interface MessageItemProps {
  message: Message;
  partnerProfile?: PartnerProfile | null;
  showAvatar?: boolean;
}

export function MessageItem({ message, partnerProfile, showAvatar = true }: MessageItemProps) {
  const { user } = useAuth();
  const isOwnMessage = message.sender_id === user?.id;

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "HH:mm");
    } catch {
      return "";
    }
  };

  return (
    <div
      className={`flex gap-2 ${
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* アバター（自分のメッセージ以外で表示） */}
      {!isOwnMessage && (
        <div className="w-8 flex-shrink-0">
          {showAvatar ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={partnerProfile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {partnerProfile?.display_name?.[0] || partnerProfile?.username?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </div>
      )}

      {/* メッセージバブル */}
      <div className={`flex flex-col gap-1 ${isOwnMessage ? "items-end" : "items-start"}`}>
        <div
          className={`max-w-[260px] rounded-2xl px-4 py-2.5 ${
            isOwnMessage
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-background border shadow-sm rounded-bl-md"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        
        {/* タイムスタンプ */}
        <span className="text-[10px] text-muted-foreground px-1">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
