
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import type { Message } from "./types";

interface ChatStepProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  onProceedToShipping: () => void;
  showShippingButton: boolean;
}

export function ChatStep({ 
  messages, 
  onSendMessage, 
  onProceedToShipping, 
  showShippingButton 
}: ChatStepProps) {
  return (
    <>
      <MessageList messages={messages} />
      <div className="p-4 space-y-4">
        <MessageInput onSendMessage={onSendMessage} />
        
        {showShippingButton && (
          <Button 
            onClick={onProceedToShipping} 
            className="w-full"
            variant="secondary"
          >
            <Truck className="mr-2 h-4 w-4" />
            郵送手続きに進む
          </Button>
        )}
      </div>
    </>
  );
}
