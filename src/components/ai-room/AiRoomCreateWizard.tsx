import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles, Wand2, Share2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ROOM_STYLE_PRESETS, getStylePresetById } from "./roomStylePresets";
import {
  ROOM_VISUAL_STYLES,
  getVisualStyleById,
  DEFAULT_VISUAL_STYLE_ID,
} from "./roomVisualStyles";
import { useGenerateAiRoom, AiGeneratedRoom } from "@/hooks/ai-room/useAiRooms";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { SpendPointsDialog } from "@/components/shop/SpendPointsDialog";
import { useFirstTimeFree } from "@/hooks/useFirstTimeFree";

const ROOM_COST = 100;

type Step = "items" | "style" | "visual" | "generating" | "result";

interface AiRoomCreateWizardProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (room: AiGeneratedRoom) => void;
}

interface UserItemLite {
  id: string;
  title: string;
  image: string;
}

const MAX_ITEMS = 3;
const TOTAL_STEPS = 3;

export function AiRoomCreateWizard({ open, onOpenChange, onCreated }: AiRoomCreateWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("items");
  const [selectedItems, setSelectedItems] = useState<UserItemLite[]>([]);
  const [stylePresetId, setStylePresetId] = useState<string | null>(null);
  const [visualStyleId, setVisualStyleId] = useState<string>(DEFAULT_VISUAL_STYLE_ID);
  const [customPrompt, setCustomPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [resultRoom, setResultRoom] = useState<AiGeneratedRoom | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const generateMutation = useGenerateAiRoom();
  const { data: isFirstTime = false } = useFirstTimeFree({
    transactionTypes: ["ai_room_generation", "ai_room_generation_free"],
    extraTable: "ai_generated_rooms",
  });

  const { data: items = [] } = useQuery({
    queryKey: ["user-items-for-ai-room", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image")
        .eq("user_id", user.id)
        .neq("quantity", 0)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as UserItemLite[];
    },
    enabled: open && !!user?.id,
  });

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("items");
        setSelectedItems([]);
        setStylePresetId(null);
        setVisualStyleId(DEFAULT_VISUAL_STYLE_ID);
        setCustomPrompt("");
        setTitle("");
        setResultRoom(null);
      }, 300);
    }
  }, [open]);

  const selectedStyle = useMemo(
    () => (stylePresetId ? getStylePresetById(stylePresetId) : null),
    [stylePresetId]
  );
  const selectedVisual = useMemo(
    () => getVisualStyleById(visualStyleId),
    [visualStyleId]
  );

  const canProceedFromItems = selectedItems.length > 0;
  const canProceedFromStyle = !!stylePresetId || customPrompt.trim().length > 5;
  const canProceedFromVisual = !!visualStyleId;

  const stepIndex = step === "items" ? 1 : step === "style" ? 2 : step === "visual" ? 3 : 0;

  const toggleItem = (item: UserItemLite) => {
    setSelectedItems((prev) => {
      const exists = prev.find((p) => p.id === item.id);
      if (exists) return prev.filter((p) => p.id !== item.id);
      if (prev.length >= MAX_ITEMS) {
        toast.error(`最大${MAX_ITEMS}個まで選べます`);
        return prev;
      }
      return [...prev, item];
    });
  };

  const handleGenerateClick = () => {
    if (!canProceedFromItems || !canProceedFromVisual) return;
    setConfirmOpen(true);
  };

  const handleGenerate = async () => {
    if (!canProceedFromItems) return;
    setConfirmOpen(false);
    setStep("generating");
    try {
      const stylePrompt =
        selectedStyle?.prompt || customPrompt || "シンプルで清潔な白い部屋";
      const room = await generateMutation.mutateAsync({
        itemImageUrls: selectedItems.map((i) => i.image),
        itemIds: selectedItems.map((i) => i.id),
        stylePrompt,
        stylePreset: stylePresetId || undefined,
        visualStyle: visualStyleId,
        visualStylePrompt: selectedVisual?.prompt,
        customPrompt: customPrompt.trim() || undefined,
        title: title.trim() || undefined,
      });
      setResultRoom(room);
      setStep("result");
      onCreated?.(room);
    } catch {
      setStep("visual");
    }
  };

  const handleShare = async () => {
    if (!resultRoom) return;
    const text = `AIで作った推し部屋 🏠✨\n#Collectify`;
    try {
      if (navigator.share) {
        try {
          const res = await fetch(resultRoom.image_url);
          const blob = await res.blob();
          const file = new File([blob], "ai-room.png", { type: blob.type });
          if ((navigator as any).canShare?.({ files: [file] })) {
            await navigator.share({ text, files: [file] });
            return;
          }
        } catch {}
        await navigator.share({ text, url: resultRoom.image_url });
      } else {
        await navigator.clipboard.writeText(resultRoom.image_url);
        toast.success("画像URLをコピーしました");
      }
    } catch {}
  };

  const handleDownload = () => {
    if (!resultRoom) return;
    const a = document.createElement("a");
    a.href = resultRoom.image_url;
    a.download = `collectify-ai-room-${resultRoom.id}.png`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            AIで推しルームを作る
            {stepIndex > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                Step {stepIndex}/{TOTAL_STEPS}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === "items" && (
              <motion.div
                key="items"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                className="p-5 space-y-4"
              >
                <div>
                  <h3 className="text-base font-semibold mb-1">推しグッズを選ぶ</h3>
                  <p className="text-xs text-muted-foreground">
                    1〜{MAX_ITEMS}個のグッズを選ぶと、AIがあなたの部屋に配置します
                  </p>
                </div>

                {items.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    コレクションにアイテムがありません。
                    <br />
                    まずはグッズを追加してください。
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {items.map((item) => {
                      const isSelected = selectedItems.some((s) => s.id === item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleItem(item)}
                          className={cn(
                            "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                            isSelected
                              ? "border-primary scale-[0.95] shadow-md"
                              : "border-border hover:border-primary/40"
                          )}
                        >
                          <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                <Check className="w-4 h-4" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {step === "style" && (
              <motion.div
                key="style"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                className="p-5 space-y-4"
              >
                <div>
                  <h3 className="text-base font-semibold mb-1">部屋のスタイル</h3>
                  <p className="text-xs text-muted-foreground">
                    プリセットを選ぶか、自由に記述できます
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {ROOM_STYLE_PRESETS.map((p) => {
                    const active = stylePresetId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setStylePresetId(active ? null : p.id)}
                        className={cn(
                          "relative rounded-xl overflow-hidden border-2 transition-all text-left",
                          active
                            ? "border-primary scale-[0.98] shadow-md"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <div
                          className={cn(
                            "aspect-[5/3] w-full flex items-center justify-center bg-gradient-to-br relative",
                            p.gradient
                          )}
                        >
                          <span className="text-4xl drop-shadow-md">{p.emoji}</span>
                          {active && (
                            <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background flex items-center justify-center shadow-md">
                              <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div className="p-2 bg-card">
                          <p className="text-xs font-semibold">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                            {p.tagline}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-sm font-medium">
                    追加の要望 <span className="text-xs text-muted-foreground font-normal">(任意)</span>
                  </p>
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="例: 窓から桜が見える、猫がいる、ぬいぐるみをたくさん..."
                    maxLength={300}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-[10px] text-right text-muted-foreground">
                    {customPrompt.length}/300
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    タイトル <span className="text-xs text-muted-foreground font-normal">(任意)</span>
                  </p>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例: 私の理想のサイバー部屋"
                    maxLength={50}
                  />
                </div>
              </motion.div>
            )}

            {step === "visual" && (
              <motion.div
                key="visual"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                className="p-5 space-y-4"
              >
                <div>
                  <h3 className="text-base font-semibold mb-1">絵柄スタイル</h3>
                  <p className="text-xs text-muted-foreground">
                    部屋をどんなタッチで描くか選びましょう
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                    <Sparkles className="w-3 h-3" />
                    1回の生成に 50pt 消費します
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {ROOM_VISUAL_STYLES.map((v) => {
                    const active = visualStyleId === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setVisualStyleId(v.id)}
                        className={cn(
                          "relative rounded-xl overflow-hidden border-2 transition-all text-left p-3 bg-card",
                          active
                            ? "border-primary scale-[0.98] shadow-md ring-2 ring-primary/20"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-2xl shrink-0">{v.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold flex items-center gap-1">
                              {v.name}
                              {active && (
                                <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                              )}
                            </p>
                            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                              {v.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === "generating" && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-10 flex flex-col items-center justify-center min-h-[400px] space-y-5"
              >
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], rotate: [0, 15, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-2xl"
                  >
                    <Wand2 className="w-10 h-10 text-primary-foreground" />
                  </motion.div>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      style={{
                        left: `${50 + Math.cos((i / 5) * Math.PI * 2) * 60}%`,
                        top: `${50 + Math.sin((i / 5) * Math.PI * 2) * 60}%`,
                      }}
                      animate={{ scale: [0, 1, 0], opacity: [0, 1, 0], rotate: [0, 180, 360] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                    >
                      <Sparkles className="w-4 h-4 text-primary" />
                    </motion.div>
                  ))}
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-base">AIが部屋を描いています...</p>
                  <p className="text-xs text-muted-foreground">
                    30〜60秒ほどかかります。お楽しみに！
                  </p>
                </div>
              </motion.div>
            )}

            {step === "result" && resultRoom && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 space-y-4"
              >
                <div className="flex items-center gap-2 justify-center mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">完成！</h3>
                </div>
                <div className="relative rounded-2xl overflow-hidden border-2 border-border shadow-xl">
                  <img
                    src={resultRoom.image_url}
                    alt=""
                    className="w-full h-auto"
                  />
                </div>
                {resultRoom.title && (
                  <p className="text-center font-medium">{resultRoom.title}</p>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleDownload} variant="outline" className="flex-1 gap-2">
                    <Download className="w-4 h-4" />
                    保存
                  </Button>
                  <Button onClick={handleShare} className="flex-1 gap-2">
                    <Share2 className="w-4 h-4" />
                    シェア
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step !== "generating" && step !== "result" && (
          <div className="border-t p-3 flex gap-2 shrink-0">
            {step === "style" && (
              <Button
                variant="outline"
                onClick={() => setStep("items")}
                className="gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                戻る
              </Button>
            )}
            {step === "visual" && (
              <Button
                variant="outline"
                onClick={() => setStep("style")}
                className="gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                戻る
              </Button>
            )}
            <div className="flex-1" />
            {step === "items" && (
              <Button
                onClick={() => setStep("style")}
                disabled={!canProceedFromItems}
                className="gap-1.5"
              >
                次へ ({selectedItems.length}/{MAX_ITEMS})
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
            {step === "style" && (
              <Button
                onClick={() => setStep("visual")}
                disabled={!canProceedFromStyle}
                className="gap-1.5"
              >
                次へ
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
            {step === "visual" && (
              <Button
                onClick={handleGenerate}
                disabled={!canProceedFromVisual || generateMutation.isPending}
                className="gap-1.5"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                生成する (50pt)
              </Button>
            )}
          </div>
        )}

        {step === "result" && (
          <div className="border-t p-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              閉じる
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
