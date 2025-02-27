
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useState } from "react";

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<void>;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      await onSendMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="メッセージを入力..."
        className="flex-1"
      />
      <Button onClick={handleSendMessage} size="icon">
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
