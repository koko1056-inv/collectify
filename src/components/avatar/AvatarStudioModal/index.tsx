import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Shirt, Sparkles, Wand2 } from "lucide-react";
import { useAvatars } from "@/hooks/useAvatars";
import { GenerateTab } from "./GenerateTab";
import { DressUpTab } from "./DressUpTab";
import { GalleryTab } from "./GalleryTab";

export type StudioTab = "generate" | "dressup" | "gallery";

interface AvatarStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialTab?: StudioTab;
  initialBaseAvatarUrl?: string | null;
}

export function AvatarStudioModal({
  isOpen,
  onClose,
  userId,
  initialTab = "generate",
  initialBaseAvatarUrl,
}: AvatarStudioModalProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);
  const avatars = useAvatars(userId);

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            アバタースタジオ
          </DialogTitle>
          <DialogDescription>AIでアバターを生成・着せ替え・管理</DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as StudioTab)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-6 grid grid-cols-3 h-12">
            <TabsTrigger value="generate" className="gap-2">
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">生成</span>
            </TabsTrigger>
            <TabsTrigger value="dressup" className="gap-2">
              <Shirt className="w-4 h-4" />
              <span className="hidden sm:inline">着せ替え</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="gap-2 relative">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">ギャラリー</span>
              {avatars.avatars.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
                  {avatars.avatars.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="generate" className="mt-0">
              <GenerateTab avatars={avatars} />
            </TabsContent>
            <TabsContent value="dressup" className="mt-0">
              <DressUpTab
                avatars={avatars}
                userId={userId}
                initialBaseAvatarUrl={initialBaseAvatarUrl ?? null}
                onDone={() => setActiveTab("gallery")}
              />
            </TabsContent>
            <TabsContent value="gallery" className="mt-0">
              <GalleryTab avatars={avatars} onSwitchToGenerate={() => setActiveTab("generate")} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
