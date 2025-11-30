import { Button } from "@/components/ui/button";
import { AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd } from "lucide-react";
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
  onAlignBottom
}: AlignmentToolsProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-2 bg-background border rounded-lg">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
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
              onClick={onAlignCenter}
              disabled={disabled}
            >
              <AlignCenter className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>中央揃え</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onAlignRight}
              disabled={disabled}
            >
              <AlignRight className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>右揃え</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
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
              onClick={onAlignMiddle}
              disabled={disabled}
            >
              <AlignVerticalJustifyCenter className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>垂直中央揃え</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onAlignBottom}
              disabled={disabled}
            >
              <AlignVerticalJustifyEnd className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>下揃え</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}