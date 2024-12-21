import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface MediaSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  ipList: string[];
  mediaOptions?: {
    type: string;
    label: string;
    items: string[];
  }[];
  type?: 'media' | 'category';
  placeholder?: string;
}

export function MediaSelector({
  value,
  onValueChange,
  ipList,
  mediaOptions,
  type = 'media',
  placeholder = "アニメ/アーティストから選択"
}: MediaSelectorProps) {
  const getDisplayText = () => {
    if (value === "all") return placeholder;
    if (value.startsWith("ip:")) return value.replace("ip:", "");
    const [type, name] = value.split(":");
    return name;
  };

  return (
    <Button
      variant="outline"
      onClick={() => onValueChange("all")}
      className="w-full justify-between font-normal"
    >
      <span>{getDisplayText()}</span>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </Button>
  );
}