import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, CheckCircle } from "lucide-react";
import { useState } from "react";

interface ChatInputFormProps {
  onSendMessage: (content: string) => void;
  onComplete?: () => void;
  isCompleting?: boolean;
  showCompleteButton?: boolean;
}

export function ChatInputForm({ 
  onSendMessage, 
  onComplete, 
  isCompleting,
  showCompleteButton 
}: ChatInputFormProps) {
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage.trim());
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div className="p-4 space-y-4">
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
      {showCompleteButton && (
        <Button 
          onClick={onComplete}
          disabled={isCompleting}
          className="w-full"
          variant="secondary"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          トレードを完了する
        </Button>
      )}
    </div>
  );
}