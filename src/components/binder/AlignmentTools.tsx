import { Button } from "@/components/ui/button";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AlignmentToolsProps {
  disabled?: boolean;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onAlignTop: () => void;
  onAlignMiddle: () => void;
  onAlignBottom: () => void;
}

export function AlignmentTools({
  disabled = false,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
}: AlignmentToolsProps) {
  return (
    <TooltipProvider>
      <div className="flex gap-1 p-2 bg-white rounded-lg shadow-lg border">
        <div className="flex gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onAlignLeft}
                disabled={disabled}
              >
                <AlignLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>左揃え</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onAlignCenter}
                disabled={disabled}
              >
                <AlignCenter className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>中央揃え（横）</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onAlignRight}
                disabled={disabled}
              >
                <AlignRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>右揃え</TooltipContent>
          </Tooltip>
        </div>

        <div className="w-px bg-border" />

        <div className="flex gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onAlignTop}
                disabled={disabled}
              >
                <AlignVerticalJustifyStart className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>上揃え</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onAlignMiddle}
                disabled={disabled}
              >
                <AlignVerticalJustifyCenter className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>中央揃え（縦）</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onAlignBottom}
                disabled={disabled}
              >
                <AlignVerticalJustifyEnd className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>下揃え</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
