import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import type { Message, PartnerProfile } from "./types";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatStepProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  partnerProfile?: PartnerProfile | null;
}

const MESSAGE_TEMPLATE_KEYS = [
  "social.chat.template1",
  "social.chat.template2",
  "social.chat.template3",
  "social.chat.template4",
];

export function ChatStep({ messages, onSendMessage, partnerProfile }: ChatStepProps) {
  const { t } = useLanguage();
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
              <span>{t("social.chat.templatePrompt")}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MESSAGE_TEMPLATE_KEYS.map((templateKey, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5 px-2.5 rounded-full whitespace-normal text-left"
                  onClick={() => handleTemplateClick(t(templateKey))}
                >
                  {t(templateKey)}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        <MessageInput onSendMessage={onSendMessage} />
      </div>
    </div>
  );
}

