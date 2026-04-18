import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Palette, User, Music } from "lucide-react";
import { ROOM_THEMES } from "./roomThemes";
import { setRoomTheme } from "./autoPlace";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { AvatarPicker } from "./AvatarPicker";
import { BgmPicker } from "./BgmPicker";
import { getRecommendedBgm } from "@/components/room3d/roomBgm";

interface SceneEditorSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roomId: string;
  currentThemeId: string;
  currentAvatarUrl: string | null;
  currentBgmId: string | null;
}

export function SceneEditorSheet({
  open,
  onOpenChange,
  roomId,
  currentThemeId,
  currentAvatarUrl,
  currentBgmId,
}: SceneEditorSheetProps) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const handlePickTheme = async (id: string) => {
    setBusy(true);
    try {
      await setRoomTheme(roomId, id);
      // テーマに合わせたおすすめBGMを自動セット (現在BGM未設定のときだけ)
      if (!currentBgmId) {
        const rec = getRecommendedBgm(id);
        if (rec) {
          await supabase
            .from("binder_pages")
            .update({ bgm_preset: rec.id })
            .eq("id", roomId);
        }
      }
      qc.invalidateQueries({ queryKey: ["main-room"] });
      toast.success("お部屋を模様替えしました");
    } catch {
      toast.error("失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const handlePickAvatar = async (url: string | null) => {
    setBusy(true);
    try {
      await supabase
        .from("binder_pages")
        .update({ scene_avatar_url: url })
        .eq("id", roomId);
      qc.invalidateQueries({ queryKey: ["main-room"] });
      toast.success(url ? "アバターを変更しました" : "アバターを外しました");
    } catch {
      toast.error("失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const handlePickBgm = async (id: string | null) => {
    setBusy(true);
    try {
      await supabase
        .from("binder_pages")
        .update({ bgm_preset: id })
        .eq("id", roomId);
      qc.invalidateQueries({ queryKey: ["main-room"] });
      toast.success(id ? "BGMを設定しました" : "BGMを外しました");
    } catch {
      toast.error("失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[88vh] rounded-t-3xl p-0 flex flex-col">
        <SheetHeader className="p-5 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            シーン編集
          </SheetTitle>
          <SheetDescription>
            お部屋のスタイル・アバター・BGMを設定できます
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="style" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-5 mt-3 grid grid-cols-3 h-11 rounded-full bg-muted p-1">
            <TabsTrigger value="style" className="rounded-full text-xs gap-1.5">
              <Palette className="w-3.5 h-3.5" /> スタイル
            </TabsTrigger>
            <TabsTrigger value="avatar" className="rounded-full text-xs gap-1.5">
              <User className="w-3.5 h-3.5" /> アバター
            </TabsTrigger>
            <TabsTrigger value="bgm" className="rounded-full text-xs gap-1.5">
              <Music className="w-3.5 h-3.5" /> BGM
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-5">
            <TabsContent value="style" className="mt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ROOM_THEMES.map((theme) => {
                  const active = theme.id === currentThemeId;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => handlePickTheme(theme.id)}
                      disabled={busy}
                      className={cn(
                        "relative rounded-2xl border-2 p-2.5 text-left transition-all disabled:opacity-60",
                        active
                          ? "border-primary scale-[1.02]"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <div
                        className="w-full aspect-[4/3] rounded-lg mb-2 overflow-hidden"
                        style={{ background: theme.ambient }}
                      >
                        <svg viewBox="0 0 100 75" className="w-full h-full block">
                          <polygon points="10,8 90,8 90,40 10,40" fill={theme.wall} />
                          <polygon points="0,4 10,8 10,45 0,55" fill={theme.wallSide} />
                          <polygon points="10,40 90,40 100,55 0,55" fill={theme.floor} />
                          <rect x={25} y={20} width={40} height={2} fill={theme.shelf} />
                          <rect x={25} y={28} width={40} height={2} fill={theme.shelf} />
                        </svg>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{theme.emoji}</span>
                        <p className="text-xs font-semibold truncate">{theme.name}</p>
                        {active && <Check className="w-3.5 h-3.5 ml-auto text-primary shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="avatar" className="mt-0">
              <AvatarPicker currentUrl={currentAvatarUrl} onPick={handlePickAvatar} busy={busy} />
            </TabsContent>

            <TabsContent value="bgm" className="mt-0">
              <BgmPicker currentId={currentBgmId} onPick={handlePickBgm} busy={busy} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
