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
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t } = useLanguage();
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
            {t("misc.avatar.studioTitle")}
          </DialogTitle>
          <DialogDescription>{t("misc.avatar.studioDesc")}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as StudioTab)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* モバイルでもラベルを出す。アイコンだけでは「👕＝着せ替え」が伝わらない */}
          <TabsList className="mx-6 grid grid-cols-3 h-auto py-1 sm:h-12">
            <TabsTrigger value="generate" className="flex-col gap-0.5 text-[10px] sm:flex-row sm:gap-2 sm:text-sm">
              <Wand2 className="w-4 h-4" />
              <span>{t("misc.avatar.tabGenerate")}</span>
            </TabsTrigger>
            <TabsTrigger value="dressup" className="flex-col gap-0.5 text-[10px] sm:flex-row sm:gap-2 sm:text-sm">
              <Shirt className="w-4 h-4" />
              <span>{t("misc.avatar.tabDressUp")}</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="relative flex-col gap-0.5 text-[10px] sm:flex-row sm:gap-2 sm:text-sm">
              <ImageIcon className="w-4 h-4" />
              <span>{t("misc.avatar.tabGallery")}</span>
              {avatars.avatars.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
                  {avatars.avatars.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="generate" className="mt-0">
              <GenerateTab avatars={avatars} onGoToGallery={() => setActiveTab("gallery")} />
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
