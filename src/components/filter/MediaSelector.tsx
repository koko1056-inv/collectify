import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

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
  const [searchQuery, setSearchQuery] = useState("");

  const getDisplayText = () => {
    if (value === "all") return "アニメ/アーティストから選択";
    if (value.startsWith("ip:")) return `アニメ: ${value.replace("ip:", "")}`;
    const [type, name] = value.split(":");
    return type === "artist" ? `アーティスト: ${name}` : `アニメ: ${name}`;
  };

  const handleClick = () => {
    setIsDialogOpen(true);
  };

  const handleSelect = (value: string) => {
    onValueChange(value);
    setIsDialogOpen(false);
  };

  // Filter items based on search query
  const filteredIpList = ipList.filter(ip =>
    ip.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMediaOptions = mediaOptions.map(option => ({
    ...option,
    items: option.items.filter(item =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }));

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        onClick={handleClick}
        className="w-full justify-between font-normal"
      >
        <span>{getDisplayText()}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              カテゴリを選択
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="カテゴリを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            </div>
            <ScrollArea className="h-[50vh] pr-4">
              <div className="grid grid-cols-2 gap-2 p-4">
                <Button
                  key="all"
                  variant={value === "all" ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                  onClick={() => handleSelect("all")}
                >
                  すべて
                </Button>
                {filteredIpList.map((ip) => (
                  <Button
                    key={ip}
                    variant={value === `ip:${ip}` ? "default" : "outline"}
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
                      variant={value === `${option.type}:${item}` ? "default" : "outline"}
                      className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                      onClick={() => handleSelect(`${option.type}:${item}`)}
                    >
                      {item}
                    </Button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}