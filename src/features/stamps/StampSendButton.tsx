import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sticker, Check } from "lucide-react";
import { STAMPS, type StampContext } from "./types";
import { useSendStamp, useRecentStampSent } from "./useGreetingStamp";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface StampSendButtonProps {
  receiverId: string;
  contextType?: StampContext;
  contextId?: string | null;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "icon";
  label?: string;
  fullWidth?: boolean;
}

export function StampSendButton({
  receiverId,
  contextType,
  contextId,
  variant = "outline",
  size = "sm",
  label,
  fullWidth = false,
}: StampSendButtonProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const { data: alreadySent } = useRecentStampSent(receiverId);
  const sendMutation = useSendStamp();

  if (!user || user.id === receiverId) return null;

  const handleSend = (type: typeof STAMPS[number]["type"]) => {
    sendMutation.mutate(
      { receiverId, stampType: type, contextType, contextId },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={alreadySent}
          className={fullWidth ? "w-full" : undefined}
        >
          {alreadySent ? <Check className="h-4 w-4 mr-1" /> : <Sticker className="h-4 w-4 mr-1" />}
          {alreadySent ? t("trade.stamp.sent") : (label ?? t("trade.stamp.defaultLabel"))}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <p className="text-xs text-muted-foreground mb-2">{t("trade.stamp.hint")}</p>
        <div className="grid grid-cols-2 gap-2">
          {STAMPS.map((s) => (
            <button
              key={s.type}
              onClick={() => handleSend(s.type)}
              disabled={sendMutation.isPending}
              className="flex flex-col items-center gap-1 p-2 rounded-md border hover:bg-muted transition disabled:opacity-50"
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className="text-xs font-medium">{t(`trade.stampType.${s.type}`)}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          {t("trade.stamp.limitNote")}
        </p>
      </PopoverContent>
    </Popover>
  );
}
