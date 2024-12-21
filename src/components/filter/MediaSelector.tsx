import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { MediaSelectionDialog } from "./MediaSelectionDialog";

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
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const getDisplayText = () => {
    if (value === "all") return "アニメ/アーティストから選択";
    if (value.startsWith("ip:")) {
      const ipName = value.replace("ip:", "");
      return `${ipName}`;
    }
    const [type, name] = value.split(":");
    return `${name}`;
  };

  const handleSelect = (value: string) => {
    if (value === "all") {
      navigate("/");
    }
    onValueChange(value);
  };

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        onClick={() => setIsDialogOpen(true)}
        className="w-full justify-between font-normal"
      >
        <span>{getDisplayText()}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>

      <MediaSelectionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSelect={handleSelect}
        currentValue={value}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        ipList={ipList}
        mediaOptions={mediaOptions}
      />
    </div>
  );
}