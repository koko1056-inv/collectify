import { Button } from "@/components/ui/button";
import { Truck, Sparkles } from "lucide-react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import type { Message, PartnerProfile } from "./types";

interface ChatStepProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  onProceedToShipping: () => void;
  showShippingButton: boolean;
  partnerProfile?: PartnerProfile | null;
}

const MESSAGE_TEMPLATES = [
  "はじめまして！欲しいものリストで見つけました😊",
  "こんにちは！お持ちのグッズに興味があります✨",
  "交換についてご相談させてください🤝",
  "フォローさせていただきました！よろしくお願いします🙌",
];

export function ChatStep({ 
  messages, 
  onSendMessage, 
  onProceedToShipping, 
  showShippingButton,
  partnerProfile
}: ChatStepProps) {
  const showTemplates = messages.length === 0;

  const handleTemplateClick = (template: string) => {
    onSendMessage(template);
  };

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} partnerProfile={partnerProfile} />
      
      <div className="p-3 border-t bg-background space-y-2">
        {/* 初回メッセージ時のテンプレート候補 */}
        {showTemplates && (
          <div className="space-y-2 pb-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>定型文を選択</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MESSAGE_TEMPLATES.map((template, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5 px-2.5 rounded-full whitespace-normal text-left"
                  onClick={() => handleTemplateClick(template)}
                >
                  {template}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        <MessageInput onSendMessage={onSendMessage} />
        
        {showShippingButton && (
          <Button 
            onClick={onProceedToShipping} 
            className="w-full"
            variant="secondary"
            size="sm"
          >
            <Truck className="mr-2 h-4 w-4" />
            郵送手続きに進む
          </Button>
        )}
      </div>
    </div>
  );
}

