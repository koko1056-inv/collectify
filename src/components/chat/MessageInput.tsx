import { Button } from "@/components/ui/button";
import { Send, Smile } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<void>;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async () => {
    if (newMessage.trim() && !isSending) {
      setIsSending(true);
      try {
        await onSendMessage(newMessage.trim());
        setNewMessage("");
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 relative">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          className="min-h-[44px] max-h-[120px] resize-none pr-10 rounded-2xl border-muted-foreground/20 focus-visible:ring-primary/30"
          rows={1}
        />
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-1 bottom-1 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </div>
      <Button 
        onClick={handleSendMessage} 
        size="icon"
        disabled={!newMessage.trim() || isSending}
        className="h-11 w-11 rounded-full shrink-0"
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
}
