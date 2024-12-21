import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);

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
      onValueChange(value);
    } else {
      onValueChange(value);
    }
    setIsDialogOpen(false);
    setSearchQuery("");
  };

  const handleAddNew = () => {
    if (!searchQuery.trim()) return;

    handleSelect(`custom:${searchQuery.trim()}`);
    toast({
      title: "追加しました",
      description: `「${searchQuery.trim()}」を追加しました。`,
    });
    setSearchQuery("");
    setIsAdding(false);
  };

  const filteredIpList = ipList.filter(ip =>
    ip.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMediaOptions = mediaOptions.map(option => ({
    ...option,
    items: option.items.filter(item =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }));

  const showAddButton = searchQuery.trim() !== "" && 
    ![...ipList, ...mediaOptions.flatMap(opt => opt.items)]
      .map(item => item.toLowerCase())
      .includes(searchQuery.toLowerCase());

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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              アニメ/アーティストを選択
            </DialogTitle>
            <DialogDescription>
              既存のものから選択するか、新しく追加できます。
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 pb-0">
            <Input
              placeholder="検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
          </div>
          <ScrollArea className="h-[50vh] pr-4">
            <div className="grid grid-cols-2 gap-2 p-4">
              {searchQuery === "" && (
                <Button
                  key="all"
                  variant={value === "all" ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                  onClick={() => handleSelect("all")}
                >
                  すべて
                </Button>
              )}
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
              {showAddButton && (
                <Button
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                  onClick={handleAddNew}
                >
                  「{searchQuery}」を追加
                </Button>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}