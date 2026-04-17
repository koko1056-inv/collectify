import { useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { REACTION_EMOJIS } from "@/hooks/useRoomReactions";
import { cn } from "@/lib/utils";

interface ReactionPickerProps {
  onSend: (emoji: string) => void;
  disabled?: boolean;
}

export function ReactionPicker({ onSend, disabled }: ReactionPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="text-white hover:bg-white/10"
        >
          <Smile className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 bg-background/95 backdrop-blur-md border-border">
        <div className="grid grid-cols-5 gap-1">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSend(emoji);
                setOpen(false);
              }}
              className={cn(
                "w-10 h-10 rounded-lg text-2xl",
                "hover:bg-accent hover:scale-125 active:scale-100 transition-transform"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
