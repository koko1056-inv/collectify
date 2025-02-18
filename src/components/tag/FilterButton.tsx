
import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface FilterButtonProps {
  displayText: string;
  onClick: () => void;
}

export function FilterButton({ displayText, onClick }: FilterButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="w-full justify-between font-normal text-xs h-8"
    >
      <span className="truncate">{displayText}</span>
      <ChevronDown className="h-3 w-3 opacity-50 ml-2 flex-shrink-0" />
    </Button>
  );
}
