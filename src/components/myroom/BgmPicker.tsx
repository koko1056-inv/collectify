import { useEffect, useRef, useState } from "react";
import { BGM_PRESETS } from "@/components/room3d/roomBgm";
import { Check, Play, Pause, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface BgmPickerProps {
  currentId: string | null;
  onPick: (id: string | null) => void;
  busy?: boolean;
}

export function BgmPicker({ currentId, onPick, busy }: BgmPickerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const togglePreview = (id: string, url: string) => {
    if (previewing === id) {
      audioRef.current?.pause();
      setPreviewing(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(url);
    audio.volume = 0.4;
    audio.loop = true;
    audio.play().catch(() => {});
    audioRef.current = audio;
    setPreviewing(id);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        お部屋のBGMを設定できます。訪問者は再生ボタンから聴けます
      </p>

      {/* なし */}
      <button
        onClick={() => onPick(null)}
        disabled={busy}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all",
          !currentId
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
        )}
      >
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <VolumeX className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold">BGMなし</p>
          <p className="text-[11px] text-muted-foreground">音楽を流さない</p>
        </div>
        {!currentId && <Check className="w-4 h-4 text-primary" />}
      </button>

      <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
        {BGM_PRESETS.map((b) => {
          const active = currentId === b.id;
          const isPreview = previewing === b.id;
          return (
            <div
              key={b.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all",
                active
                  ? "border-primary bg-primary/5"
                  : "border-border",
              )}
            >
              <button
                onClick={() => togglePreview(b.id, b.url)}
                className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/70 active:scale-95 transition-all shrink-0"
                title="試聴"
              >
                {isPreview ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>
              <button
                onClick={() => onPick(b.id)}
                disabled={busy}
                className="flex-1 text-left"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{b.icon}</span>
                  <p className="text-sm font-semibold">{b.name}</p>
                </div>
                <p className="text-[11px] text-muted-foreground capitalize">{b.mood}</p>
              </button>
              {active && <Check className="w-4 h-4 text-primary shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
