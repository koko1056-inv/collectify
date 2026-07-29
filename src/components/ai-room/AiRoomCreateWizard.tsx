import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStylePresetById } from "./roomStylePresets";
import { getVisualStyleById, DEFAULT_VISUAL_STYLE_ID } from "./roomVisualStyles";
import { useGenerateAiRoom, useToggleAiRoomPublic, AiGeneratedRoom } from "@/hooks/ai-room/useAiRooms";
import { buildWorkUrl, shareContent } from "@/utils/share";
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
import { useLanguage } from "@/contexts/LanguageContext";

const ROOM_COST = 100;
const MAX_ITEMS = 5;
const TOTAL_STEPS = 3;

type Step = "items" | "style" | "visual" | "generating" | "result";

interface AiRoomCreateWizardProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (room: AiGeneratedRoom) => void;
}

export function AiRoomCreateWizard({ open, onOpenChange, onCreated }: AiRoomCreateWizardProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("items");
  const [selectedItems, setSelectedItems] = useState<UserItemLite[]>([]);
  const [stylePresetId, setStylePresetId] = useState<string | null>(null);
  const [visualStyleId, setVisualStyleId] = useState<string>(DEFAULT_VISUAL_STYLE_ID);
  const [customPrompt, setCustomPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [resultRoom, setResultRoom] = useState<AiGeneratedRoom | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [remix, setRemix] = useState<PendingRemix | null>(null);

  const generateMutation = useGenerateAiRoom();
  const togglePublic = useToggleAiRoomPublic();
  const [isSharing, setIsSharing] = useState(false);
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
      const t = setTimeout(() => {
        setStep("items");
        setSelectedItems([]);
        setStylePresetId(null);
        setVisualStyleId(DEFAULT_VISUAL_STYLE_ID);
        setCustomPrompt("");
        setTitle("");
        setResultRoom(null);
        setRemix(null);
      }, 300);
      return () => clearTimeout(t);
    }
    // open になった瞬間に sessionStorage を確認
    const pendingRemix = consumePendingRemix();
    if (pendingRemix) {
      setRemix(pendingRemix);
      if (pendingRemix.stylePreset) setStylePresetId(pendingRemix.stylePreset);
      if (pendingRemix.customPrompt) setCustomPrompt(pendingRemix.customPrompt);
      if (pendingRemix.visualStyle) setVisualStyleId(pendingRemix.visualStyle);
      if (pendingRemix.mode === "remix" && pendingRemix.items?.length) {
        setSelectedItems(pendingRemix.items.slice(0, MAX_ITEMS));
        setStep("style");
      } else {
        // スタイル継承モードは素材選択から
        setStep("items");
      }
      toast.success(
        pendingRemix.mode === "remix"
          ? t("aiRoom.wizard.remixHandedOff")
          : t("aiRoom.wizard.styleHandedOff")
      );
      return;
    }
    const handed = consumePendingAiItems();
    if (handed.length > 0) {
      setSelectedItems(handed.slice(0, MAX_ITEMS));
      toast.success(`${Math.min(handed.length, MAX_ITEMS)}${t("aiRoom.wizard.handedOffSuffix")}`);
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
        toast.error(
          `${t("aiRoom.wizard.maxItemsPrefix")}${MAX_ITEMS}${t("aiRoom.wizard.maxItemsSuffix")}`
        );
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
    if (!resultRoom || isSharing) return;
    setIsSharing(true);
    try {
      // 共有するのはアプリ内の作品ページ。
      // ただし非公開のままだと、リンクを開いた人には見られないので先に公開する。
      // 「共有する＝見せる」なので黙って公開せず、公開したことを伝える。
      if (!resultRoom.is_public) {
        try {
          await togglePublic.mutateAsync({ roomId: resultRoom.id, isPublic: true });
          setResultRoom({ ...resultRoom, is_public: true });
          toast.success(t("aiRoom.share.madePublic"));
        } catch (e) {
          console.error("failed to publish room before sharing:", e);
          toast.error(t("aiRoom.share.publishFailed"));
          return;
        }
      }

      const result = await shareContent({
        title: t("aiRoom.share.prefix"),
        text: `${t("aiRoom.share.prefix")}\n${t("aiRoom.share.hashtags")}`,
        url: buildWorkUrl("ai-work", resultRoom.id),
        imageUrl: resultRoom.image_url,
        fileName: "collectify-ai-room.png",
      });

      // 利用者が共有シートを閉じただけのときは何も出さない
      if (result === "copied") toast.success(t("aiRoom.share.linkCopied"));
      else if (result === "failed") toast.error(t("aiRoom.share.failed"));
    } finally {
      setIsSharing(false);
    }
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

  const isBusy = step === "generating";

  return (
    <Dialog
      open={open}
      // 生成中に閉じると、処理は走り続けるのに結果を受け取れなくなる。
      // 誤タップで閉じないよう、この間だけ外側クリック・ESC・×を無効にする。
      onOpenChange={(next) => {
        if (isBusy && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-hidden p-0 flex flex-col data-[busy=true]:[&>button]:hidden"
        data-busy={isBusy}
        onInteractOutside={(e) => {
          if (isBusy) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isBusy) e.preventDefault();
        }}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          {/* 右上の×は絶対配置なので、余白を空けないと Step 表示と重なる */}
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Wand2 className="w-5 h-5 text-primary" />
            {t("aiRoom.wizard.title")}
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
                onClose={() => onOpenChange(false)}
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
                onRegenerate={() => setConfirmOpen(true)}
              />
            )}
          </AnimatePresence>
        </div>

        {step !== "generating" && step !== "result" && (
          <div className="border-t p-3 flex gap-2 shrink-0">
            {step === "style" && (
              <Button variant="outline" onClick={() => setStep("items")} className="gap-1.5">
                <ChevronLeft className="w-4 h-4" />
                {t("aiRoom.common.back")}
              </Button>
            )}
            {step === "visual" && (
              <Button variant="outline" onClick={() => setStep("style")} className="gap-1.5">
                <ChevronLeft className="w-4 h-4" />
                {t("aiRoom.common.back")}
              </Button>
            )}
            <div className="flex-1" />
            {step === "items" && (
              <Button
                onClick={() => setStep("style")}
                disabled={!canProceedFromItems}
                className="gap-1.5"
              >
                {t("aiRoom.common.next")} ({selectedItems.length}/{MAX_ITEMS})
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
            {step === "style" && (
              <Button
                onClick={() => setStep("visual")}
                disabled={!canProceedFromStyle}
                className="gap-1.5"
              >
                {t("aiRoom.common.next")}
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
                {t("aiRoom.wizard.generate")} {isFirstTime ? t("aiRoom.wizard.firstFree") : `(${ROOM_COST}pt)`}
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
              {t("aiRoom.common.close")}
            </Button>
          </div>
        )}

        <SpendPointsDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={t("aiRoom.confirm.title")}
          description={t("aiRoom.confirm.description")}
          cost={ROOM_COST}
          freeTrial={isFirstTime}
          loading={generateMutation.isPending}
          onConfirm={handleGenerate}
        />
      </DialogContent>
    </Dialog>
  );
}
