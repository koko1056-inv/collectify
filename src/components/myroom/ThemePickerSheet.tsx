import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ROOM_THEMES } from "./roomThemes";
import { setRoomTheme } from "./autoPlace";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, Palette } from "lucide-react";
import { useState } from "react";

interface ThemePickerSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roomId: string;
  currentThemeId: string;
}

export function ThemePickerSheet({ open, onOpenChange, roomId, currentThemeId }: ThemePickerSheetProps) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const handlePick = async (id: string) => {
    setBusy(id);
    try {
      await setRoomTheme(roomId, id);
      qc.invalidateQueries({ queryKey: ["main-room"] });
      toast.success("お部屋を模様替えしました");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("失敗しました");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            模様替え
          </SheetTitle>
          <SheetDescription>
            お部屋のテーマを選んでね
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-6 max-h-[60vh] overflow-y-auto">
          {ROOM_THEMES.map((theme) => {
            const active = theme.id === currentThemeId;
            return (
              <button
                key={theme.id}
                onClick={() => handlePick(theme.id)}
                disabled={busy !== null}
                className={cn(
                  "relative rounded-2xl border-2 p-3 text-left transition-all",
                  active
                    ? "border-primary scale-[1.02]"
                    : "border-border hover:border-primary/50 hover:scale-[1.02]",
                )}
              >
                {/* テーマプレビュー (壁+床のミニチュア) */}
                <div
                  className="w-full aspect-[4/3] rounded-lg mb-2 overflow-hidden border border-border/40"
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
                  <p className="text-xs font-semibold">{theme.name}</p>
                  {active && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {theme.description}
                </p>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
