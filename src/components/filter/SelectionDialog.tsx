import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Music, Tv, Star } from "lucide-react";

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
  const CategorySection = ({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-full bg-primary/10">{icon}</div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <Separator />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <Button
            key={item}
            variant="ghost"
            className="relative group h-auto py-6 flex flex-col items-center justify-center gap-2 hover:bg-accent hover:text-accent-foreground transition-all duration-200"
            onClick={() => onSelect(item)}
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              {icon}
            </div>
            <span className="text-sm font-medium text-center line-clamp-2">{item}</span>
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">カテゴリーから選択</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-8 p-4">
            <CategorySection
              title="人気IP"
              items={ipList}
              icon={<Star className="w-6 h-6 text-primary" />}
            />
            <CategorySection
              title="アーティスト"
              items={artists}
              icon={<Music className="w-6 h-6 text-primary" />}
            />
            <CategorySection
              title="アニメ"
              items={animes}
              icon={<Tv className="w-6 h-6 text-primary" />}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}