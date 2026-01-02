import { Button } from "@/components/ui/button";
import { Send, Smile } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<void>;
}

const EMOJI_LIST = [
  "😊", "😂", "🥰", "😍", "🤩", "😘", "😋", "😎",
  "🥺", "😢", "😭", "😤", "😡", "🤔", "😏", "😴",
  "👍", "👎", "👏", "🙌", "🤝", "💪", "✌️", "🤞",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💖",
  "🎉", "🎊", "✨", "⭐", "🔥", "💯", "🎁", "🎀",
];

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleEmojiClick = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 relative" ref={emojiPickerRef}>
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
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="absolute right-1 bottom-1 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          <Smile className="h-5 w-5" />
        </Button>
        
        {showEmojiPicker && (
          <div className="absolute bottom-12 right-0 bg-background border rounded-xl shadow-lg p-2 z-50 w-64">
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="h-8 w-8 flex items-center justify-center text-lg hover:bg-muted rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
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
