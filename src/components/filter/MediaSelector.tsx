import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { SelectionDialog } from "./SelectionDialog";

interface MediaSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  ipList: string[];
  mediaOptions: {
    type: string;
    label: string;
    items: string[];
  }[];
}

export function MediaSelector({
  value,
  onValueChange,
  ipList,
  mediaOptions,
}: MediaSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const getDisplayText = () => {
    if (value === "all") return "アニメ/アーティストから選択";
    if (value.startsWith("ip:")) return value.replace("ip:", "");
    const [type, name] = value.split(":");
    return name;
  };

  const handleClick = () => {
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
  };

  const handleSelect = (item: string, type?: "artist" | "anime") => {
    if (type) {
      onValueChange(`${type}:${item}`);
    } else {
      onValueChange(`ip:${item}`);
    }
    setIsDialogOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleClick}
        className="w-full justify-between font-normal"
      >
        <span>{getDisplayText()}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>

      <SelectionDialog
        isOpen={isDialogOpen}
        onClose={handleClose}
        onSelect={handleSelect}
        ipList={ipList}
        artists={mediaOptions.find(opt => opt.type === "artist")?.items || []}
        animes={mediaOptions.find(opt => opt.type === "anime")?.items || []}
      />
    </>
  );
}