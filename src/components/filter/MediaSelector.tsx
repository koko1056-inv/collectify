import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown } from "lucide-react";
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
      onValueChange(value);
    } else {
      onValueChange(value);
    }
    setIsDialogOpen(false);
    setSearchQuery("");
  };

  const handleAddNew = (type: "artist" | "ip") => {
    if (!searchQuery.trim()) return;
    const value = type === "artist" ? `artist:custom` : `ip:custom`;
    handleSelect(value);
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
        type="button"
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
                  type="button"
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
                  type="button"
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
                    type="button"
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
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                    onClick={() => handleAddNew("artist")}
                  >
                    「{searchQuery}」を
                    <br />
                    アーティストとして追加
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                    onClick={() => handleAddNew("ip")}
                  >
                    「{searchQuery}」を
                    <br />
                    アニメとして追加
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}