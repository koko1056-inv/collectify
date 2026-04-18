import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Check, UserX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarPickerProps {
  currentUrl: string | null;
  onPick: (url: string | null) => void;
  busy?: boolean;
}

export function AvatarPicker({ currentUrl, onPick, busy }: AvatarPickerProps) {
  const { user } = useAuth();

  const { data: avatars = [], isLoading } = useQuery({
    queryKey: ["avatar-gallery-picker", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("avatar_gallery")
        .select("id, image_url, name, is_current")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="py-10 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        お部屋に立たせるアバターを選んでね
      </p>
      <div className="grid grid-cols-3 gap-3">
        {/* なし */}
        <button
          onClick={() => onPick(null)}
          disabled={busy}
          className={cn(
            "relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all bg-muted/30",
            !currentUrl
              ? "border-primary scale-[1.03]"
              : "border-border hover:border-primary/50",
          )}
        >
          <UserX className="w-6 h-6 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">なし</span>
          {!currentUrl && (
            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Check className="w-3 h-3" />
            </div>
          )}
        </button>

        {avatars.map((a) => {
          const active = a.image_url === currentUrl;
          return (
            <button
              key={a.id}
              onClick={() => onPick(a.image_url)}
              disabled={busy}
              className={cn(
                "relative aspect-square rounded-2xl border-2 overflow-hidden bg-muted/30 transition-all",
                active
                  ? "border-primary scale-[1.03]"
                  : "border-border hover:border-primary/50",
              )}
            >
              <img
                src={a.image_url}
                alt={a.name ?? ""}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {active && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </button>
          );
        })}

        {avatars.length === 0 && (
          <div className="col-span-2 flex items-center justify-center text-xs text-muted-foreground">
            アバターがありません
          </div>
        )}
      </div>
    </div>
  );
}
