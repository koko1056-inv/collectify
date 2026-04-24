import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useDeleteItemRoomMessage } from "./useItemRoom";
import { TrustBadge } from "@/features/trust/TrustBadge";
import type { ItemRoomMessage } from "./types";

interface Props {
  message: ItemRoomMessage;
  roomId: string;
  showHeader: boolean;
}

export function MessageBubble({ message, roomId, showHeader }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMe = user?.id === message.user_id;
  const deleteMessage = useDeleteItemRoomMessage(roomId);

  const senderName =
    message.sender?.display_name || message.sender?.username || "コレクター";

  const goToProfile = () => {
    if (message.sender?.username) navigate(`/user/${message.sender.username}`);
  };

  return (
    <div className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
      {showHeader ? (
        <Avatar
          className="h-8 w-8 shrink-0 cursor-pointer"
          onClick={goToProfile}
        >
          <AvatarImage src={message.sender?.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">
            {senderName.slice(0, 1)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div
        className={`flex flex-col max-w-[75%] ${
          isMe ? "items-end" : "items-start"
        }`}
      >
        {showHeader && (
          <div className="flex items-center gap-1.5 mb-0.5 px-1">
            <button
              onClick={goToProfile}
              className="text-xs font-medium hover:underline"
            >
              {senderName}
            </button>
            <TrustBadge userId={message.user_id} size="xs" showLabel={false} />
          </div>
        )}

        <div className="group relative">
          <div
            className={`rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${
              isMe
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            }`}
          >
            {message.content}
          </div>
          {isMe && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute -left-8 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={() => {
                if (confirm("このメッセージを削除しますか？")) {
                  deleteMessage.mutate(message.id);
                }
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
          {formatDistanceToNow(new Date(message.created_at), {
            addSuffix: true,
            locale: ja,
          })}
        </span>
      </div>
    </div>
  );
}
