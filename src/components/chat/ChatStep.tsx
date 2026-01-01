import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";
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

export function ChatStep({ 
  messages, 
  onSendMessage, 
  onProceedToShipping, 
  showShippingButton,
  partnerProfile
}: ChatStepProps) {
  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} partnerProfile={partnerProfile} />
      <div className="p-3 border-t bg-background space-y-2">
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
