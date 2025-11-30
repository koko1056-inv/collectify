import { Button } from "@/components/ui/button";
import { MousePointer2, Image, Sticker, Frame, Type, Palette } from "lucide-react";
import { DecorationTool } from "@/types/binder";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BinderToolbarProps {
  activeTool: DecorationTool;
  onToolChange: (tool: DecorationTool) => void;
}

export function BinderToolbar({ activeTool, onToolChange }: BinderToolbarProps) {
  const tools: { icon: any; value: DecorationTool; label: string }[] = [
    { icon: MousePointer2, value: "select", label: "選択" },
    { icon: Image, value: "item", label: "アイテム" },
    { icon: Sticker, value: "sticker", label: "ステッカー" },
    { icon: Frame, value: "frame", label: "フレーム" },
    { icon: Type, value: "text", label: "テキスト" },
    { icon: Palette, value: "background", label: "背景" },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2 p-2">
        {tools.map((tool) => (
          <Tooltip key={tool.value}>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === tool.value ? "default" : "ghost"}
                size="icon"
                onClick={() => onToolChange(tool.value)}
                className="touch-manipulation w-12 h-12 md:w-10 md:h-10"
              >
                <tool.icon className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
