import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DISPLAY_STYLES, DisplayStyle } from "./displayStyles";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription, incrementUsage } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface DisplayStylePickerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemId: string;
  currentStyle?: DisplayStyle;
  onPaywall?: (reason: string) => void;
}

export function DisplayStylePicker({
  open,
  onOpenChange,
  itemId,
  currentStyle = "poster",
  onPaywall,
}: DisplayStylePickerProps) {
  const { user } = useAuth();
  const { plan, limits } = useSubscription();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<DisplayStyle>(currentStyle);
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    if (!user?.id) return;
    setApplying(true);
    try {
      // Check monthly usage vs plan limit
      const { data: usage } = await supabase
        .from("user_monthly_usage")
        .select("count")
        .eq("user_id", user.id)
        .eq("usage_type", "display_conversion")
        .eq("period_start", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0])
        .maybeSingle();

      const currentCount = usage?.count || 0;
      if (currentCount >= limits.displayConversions) {
        onPaywall?.(
          `今月のディスプレイ変換回数の上限（${limits.displayConversions}回）に達しました`
        );
        onOpenChange(false);
        return;
      }

      await supabase
        .from("binder_items")
        .update({
          display_style: selected,
          display_converted_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      await incrementUsage(user.id, "display_conversion");
      qc.invalidateQueries({ queryKey: ["room-items"] });
      qc.invalidateQueries({ queryKey: ["monthly-usage"] });
      toast.success(`ディスプレイを「${DISPLAY_STYLES.find((s) => s.id === selected)?.name}」に変更しました！`);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("変換に失敗しました");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            ディスプレイスタイルを選ぶ
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            グッズを部屋に飾るときの見た目を選べます（月{limits.displayConversions}回まで）
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {DISPLAY_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelected(style.id)}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-left",
                selected === style.id
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-3xl">{style.icon}</span>
                <div>
                  <p className="font-medium text-sm">{style.name}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {style.description}
              </p>
            </button>
          ))}
        </div>

        <Button
          onClick={handleApply}
          disabled={applying}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          size="lg"
        >
          {applying ? "変換中..." : "このスタイルで飾る"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
