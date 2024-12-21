import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: string) => void;
  ipList: string[];
  artists: string[];
  animes: string[];
}

export function SelectionDialog({
  isOpen,
  onClose,
  onSelect,
  ipList,
  artists,
  animes,
}: SelectionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">カテゴリーから選択</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full" />
              人気IP
            </h3>
            <Separator />
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {ipList.map((ip) => (
                  <Button
                    key={ip}
                    variant="ghost"
                    className="w-full justify-start text-left hover:bg-accent hover:text-accent-foreground"
                    onClick={() => onSelect(ip)}
                  >
                    {ip}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full" />
              アーティスト
            </h3>
            <Separator />
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {artists.map((artist) => (
                  <Button
                    key={artist}
                    variant="ghost"
                    className="w-full justify-start text-left hover:bg-accent hover:text-accent-foreground"
                    onClick={() => onSelect(artist)}
                  >
                    {artist}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full" />
              アニメ
            </h3>
            <Separator />
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {animes.map((anime) => (
                  <Button
                    key={anime}
                    variant="ghost"
                    className="w-full justify-start text-left hover:bg-accent hover:text-accent-foreground"
                    onClick={() => onSelect(anime)}
                  >
                    {anime}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}