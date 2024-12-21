import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

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
  };

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={isDialogOpen}
        className="w-full justify-between"
        onClick={() => setIsDialogOpen(true)}
      >
        {getDisplayText()}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              カテゴリを選択
            </DialogTitle>
          </DialogHeader>
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
              {ipList.map((ip) => (
                <Button
                  key={ip}
                  variant={value === `ip:${ip}` ? "default" : "outline"}
                  className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                  onClick={() => handleSelect(`ip:${ip}`)}
                >
                  {ip}
                </Button>
              ))}
              {mediaOptions.map((option) =>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}