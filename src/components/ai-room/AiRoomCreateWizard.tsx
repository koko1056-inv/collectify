import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStylePresetById } from "./roomStylePresets";
import { getVisualStyleById, DEFAULT_VISUAL_STYLE_ID } from "./roomVisualStyles";
import { useGenerateAiRoom, AiGeneratedRoom } from "@/hooks/ai-room/useAiRooms";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { SpendPointsDialog } from "@/components/shop/SpendPointsDialog";
import { useFirstTimeFree } from "@/hooks/useFirstTimeFree";
import { SelectItemsStep, type UserItemLite } from "./wizard/SelectItemsStep";
import { SelectStyleStep } from "./wizard/SelectStyleStep";
import { SelectVisualStep } from "./wizard/SelectVisualStep";
import { GeneratingStep } from "./wizard/GeneratingStep";
import { ResultStep } from "./wizard/ResultStep";
import { consumePendingAiItems, consumePendingRemix, type PendingRemix } from "@/utils/ai-studio-handoff";

const ROOM_COST = 100;
const MAX_ITEMS = 3;
const TOTAL_STEPS = 3;

type Step = "items" | "style" | "visual" | "generating" | "result";

interface AiRoomCreateWizardProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (room: AiGeneratedRoom) => void;
}

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

  // モーダルを開いた瞬間にコレクションから引き継いだ素材を取り込む
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
      return;
    }
    // open になった瞬間に sessionStorage を確認
    const handed = consumePendingAiItems();
    if (handed.length > 0) {
      setSelectedItems(handed.slice(0, MAX_ITEMS));
      toast.success(`${Math.min(handed.length, MAX_ITEMS)}点の素材を引き継ぎました`);
      // すでに素材は揃っているのでスタイル選択ステップへ
      setStep("style");
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
              <SelectItemsStep
                items={items}
                selectedItems={selectedItems}
                onToggle={toggleItem}
                maxItems={MAX_ITEMS}
              />
            )}
            {step === "style" && (
              <SelectStyleStep
                stylePresetId={stylePresetId}
                onStylePresetChange={setStylePresetId}
                customPrompt={customPrompt}
                onCustomPromptChange={setCustomPrompt}
                title={title}
                onTitleChange={setTitle}
              />
            )}
            {step === "visual" && (
              <SelectVisualStep
                visualStyleId={visualStyleId}
                onVisualStyleChange={setVisualStyleId}
                isFirstTime={isFirstTime}
                cost={ROOM_COST}
              />
            )}
            {step === "generating" && <GeneratingStep />}
            {step === "result" && resultRoom && (
              <ResultStep
                room={resultRoom}
                onShare={handleShare}
                onDownload={handleDownload}
              />
            )}
          </AnimatePresence>
        </div>

        {step !== "generating" && step !== "result" && (
          <div className="border-t p-3 flex gap-2 shrink-0">
            {step === "style" && (
              <Button variant="outline" onClick={() => setStep("items")} className="gap-1.5">
                <ChevronLeft className="w-4 h-4" />
                戻る
              </Button>
            )}
            {step === "visual" && (
              <Button variant="outline" onClick={() => setStep("style")} className="gap-1.5">
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
                onClick={handleGenerateClick}
                disabled={!canProceedFromVisual || generateMutation.isPending}
                className="gap-1.5"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                生成する {isFirstTime ? "(初回無料 🎁)" : `(${ROOM_COST}pt)`}
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

        <SpendPointsDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="AI推しルームを生成しますか？"
          description="選んだグッズと部屋スタイルから、AIがオリジナルの推しルーム画像を生成します。"
          cost={ROOM_COST}
          freeTrial={isFirstTime}
          loading={generateMutation.isPending}
          onConfirm={handleGenerate}
        />
      </DialogContent>
    </Dialog>
  );
}
