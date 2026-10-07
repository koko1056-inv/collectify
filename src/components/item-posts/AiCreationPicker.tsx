import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type Source = "rooms" | "avatars";

interface Creation {
  id: string;
  image_url: string;
  label: string | null;
}

interface AiCreationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 選んだ画像のURL。呼び出し側で File にして投稿画像へ加える */
  onPick: (imageUrl: string) => Promise<void> | void;
}

/**
 * 自分がAIで作った部屋・アバターを、投稿の画像として使うためのピッカー。
 * AIスタジオで作ったものが「作って終わり」にならず、投稿という出口に繋がる。
 */
export function AiCreationPicker({ open, onOpenChange, onPick }: AiCreationPickerProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [source, setSource] = useState<Source>("rooms");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["ai-creations-for-post", user?.id, source],
    queryFn: async (): Promise<Creation[]> => {
      if (!user?.id) return [];
      if (source === "rooms") {
        const { data, error } = await supabase
          .from("ai_generated_rooms")
          .select("id, image_url, title")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);
        if (error) throw error;
        return (data ?? []).map((r) => ({ id: r.id, image_url: r.image_url, label: r.title }));
      }
      const { data, error } = await supabase
        .from("avatar_gallery")
        .select("id, image_url, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []).map((r) => ({ id: r.id, image_url: r.image_url, label: r.name }));
    },
    enabled: open && !!user?.id,
  });

  const pick = async (c: Creation) => {
    setBusyId(c.id);
    try {
      await onPick(c.image_url);
      onOpenChange(false);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("engage.posts.aiPickerTitle")}</DialogTitle>
          <DialogDescription>{t("engage.posts.aiPickerDesc")}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-full bg-muted p-1 w-fit" role="tablist">
          {(["rooms", "avatars"] as Source[]).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={source === s}
              onClick={() => setSource(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                source === s ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              {t(`engage.posts.aiSource.${s}`)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="space-y-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">{t("engage.posts.aiPickerEmpty")}</p>
            <Button size="sm" className="gap-1.5" onClick={() => navigate("/my-room?tab=studio&from=post")}>
              <Wand2 className="h-4 w-4" />
              {t("engage.posts.aiOpenStudio")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {items.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={!!busyId}
                onClick={() => pick(c)}
                className="relative aspect-square overflow-hidden rounded-lg bg-muted ring-offset-background transition hover:ring-2 hover:ring-primary disabled:opacity-60"
                aria-label={c.label ?? ""}
              >
                <img src={c.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                {busyId === c.id && (
                  <span className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
