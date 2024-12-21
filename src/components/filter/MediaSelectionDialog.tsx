import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface MediaSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  currentValue: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  ipList: string[];
  mediaOptions: {
    type: string;
    label: string;
    items: string[];
  }[];
  showAllOption?: boolean;
  title?: string;
}

export function MediaSelectionDialog({
  isOpen,
  onClose,
  onSelect,
  currentValue,
  searchQuery,
  onSearchChange,
  ipList,
  mediaOptions,
  showAllOption = true,
  title = "アニメ/アーティストを選択",
}: MediaSelectionDialogProps) {
  const filteredIpList = ipList.filter(ip =>
    ip.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMediaOptions = mediaOptions.map(option => ({
    ...option,
    items: option.items.filter(item =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }));

  const handleSelect = (value: string) => {
    onSelect(value);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 pb-0">
          <Input
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="mb-4"
          />
        </div>
        <ScrollArea className="h-[50vh] pr-4">
          <div className="grid grid-cols-2 gap-2 p-4">
            {showAllOption && searchQuery === "" && (
              <Button
                key="all"
                variant={currentValue === "all" ? "default" : "outline"}
                className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                onClick={() => handleSelect("all")}
              >
                すべて
              </Button>
            )}
            {filteredIpList.map((ip) => (
              <Button
                key={ip}
                variant={currentValue === `ip:${ip}` ? "default" : "outline"}
                className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                onClick={() => handleSelect(`ip:${ip}`)}
              >
                {ip}
              </Button>
            ))}
            {filteredMediaOptions.map((option) =>
              option.items.map((item) => (
                <Button
                  key={`${option.type}:${item}`}
                  variant={currentValue === `${option.type}:${item}` ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                  onClick={() => handleSelect(`${option.type}:${item}`)}
                >
                  {item}
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}