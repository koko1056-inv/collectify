import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { Loader2, MessageCircle, Send, Users, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useItemRoom,
  useItemRoomMessages,
  useSendItemRoomMessage,
} from "./useItemRoom";
import { MessageBubble } from "./MessageBubble";

interface Props {
  officialItemId: string;
  itemTitle?: string;
}

export function ItemRoomPanel({ officialItemId, itemTitle }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: roomData, isLoading: isRoomLoading } = useItemRoom(officialItemId);
  const room = roomData?.room ?? null;
  const canAccess = roomData?.canAccess ?? false;

  const { data: messages = [], isLoading: isMessagesLoading } =
    useItemRoomMessages(room?.id);
  const sendMessage = useSendItemRoomMessage(room?.id);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自動スクロール
  useEffect(() => {
    const el = scrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  if (!user) {
    return (
      <EmptyState icon={Lock} title={t("trade.room.loginPrompt")} />
    );
  }

  if (isRoomLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-6">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium mb-1">{t("trade.room.joinTitle")}</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {t("trade.room.joinReqPrefix")}<span className="font-medium">{t("trade.room.joinReqCollection")}</span>
          {t("trade.room.joinReqMiddle")}<span className="font-medium">{t("trade.room.joinReqWishlist")}</span>
          {t("trade.room.joinReqSuffix")}
        </p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        {t("trade.room.loadFailed")}
      </div>
    );
  }

  const handleSend = () => {
    if (!input.trim() || sendMessage.isPending) return;
    sendMessage.mutate(input, {
      onSuccess: () => setInput(""),
    });
  };

  return (
    <div className="flex flex-col h-[60vh] min-h-[400px] border rounded-lg overflow-hidden bg-background">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">
              {t("trade.room.headerTitle", {
                title: itemTitle ?? t("trade.room.defaultItemTitle"),
              })}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t("trade.room.headerSubtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Users className="h-3 w-3" />
          {room.member_count}
        </div>
      </div>

      {/* メッセージリスト */}
      <ScrollArea ref={scrollRef} className="flex-1 px-3 py-3">
        {isMessagesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={t("trade.room.emptyTitle")}
            description={t("trade.room.emptyDesc")}
          />
        ) : (
          <div className="space-y-2">
            {messages.map((msg, i) => {
              const prev = i > 0 ? messages[i - 1] : null;
              const showHeader = !prev || prev.user_id !== msg.user_id;
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  roomId={room.id}
                  showHeader={showHeader}
                />
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* 入力 */}
      <div className="flex items-center gap-2 p-2 border-t bg-background">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={t("trade.room.inputPlaceholder")}
          disabled={sendMessage.isPending}
          className="flex-1"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || sendMessage.isPending}
        >
          {sendMessage.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
