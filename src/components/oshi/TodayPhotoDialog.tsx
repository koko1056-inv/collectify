import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanions, useOshiPhotos, useUploadOshiPhoto } from "@/hooks/useOshi";
import { cn } from "@/lib/utils";
import { DAILY_MISSION_KEY, generateMissionImage, useDailyMission } from "@/hooks/useDailyMission";
import { Pocke } from "@/components/pocke/Pocke";
import { pockeCheer } from "@/components/pocke/pockeCheer";

interface TodayPhotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 最初から選んでおく推しグッズ（user_item_id） */
  initialItemId?: string | null;
  /** 保存できたとき（推しの部屋で、撮ったグッズに +xp の演出を出す）。どのグッズと撮ったか */
  onSaved?: (itemId: string | null) => void;
  /** 今日のミッションの「AIで作る」から開いたとき、開いてすぐ AI で作り始める */
  autoAi?: boolean;
}

/** 今日の推しフォトを撮る（または選ぶ）。推しグッズを選ぶと、そのグッズが +3xp */
export function TodayPhotoDialog({ open, onOpenChange, initialItemId = null, onSaved, autoAi = false }: TodayPhotoDialogProps) {
  const { t } = useLanguage();
  const { data: companions = [] } = useCompanions();
  const { streak, todayDone } = useOshiPhotos();
  const upload = useUploadOshiPhoto();
  const queryClient = useQueryClient();
  // 今日のミッションのグッズ（推しグッズでないこともあるので、選べるように並べる）
  const { data: mission } = useDailyMission();
  const missionItem = mission?.item && !mission.completed ? mission.item : null;
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(initialItemId);
  const [caption, setCaption] = useState("");
  // AI で作った1枚（すでに自分の推しフォトのフォルダにある）。写真を選び直したら消す
  const [aiUrl, setAiUrl] = useState<string | null>(null);
  const [aiMaking, setAiMaking] = useState(false);

  useEffect(() => {
    if (open) setItemId(initialItemId);
  }, [open, initialItemId]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = () => {
    setFile(null);
    setAiUrl(null);
    setCaption("");
  };

  // ミッションのグッズを選んでいて、まだ達成していないときだけ AI で作れる（1日2回まで無料）
  const canAi = !!missionItem && itemId === missionItem.id && (mission?.ai_tries_left ?? 0) > 0;
  const makeWithAi = async () => {
    if (aiMaking) return;
    setAiMaking(true);
    setFile(null);
    try {
      const res = await generateMissionImage();
      setAiUrl(res.imageUrl);
      setItemId(res.itemId);
      toast.success(t("pocke.mission.aiMade"));
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      toast.error(
        code === "mission_ai_limit"
          ? t("pocke.mission.aiLimit")
          : code === "rate_limited"
            ? t("pocke.mission.aiBusy")
            : t("pocke.mission.aiFailed")
      );
    } finally {
      setAiMaking(false);
      void queryClient.invalidateQueries({ queryKey: [DAILY_MISSION_KEY] });
    }
  };

  // 「AIで作る」から開いたら、すぐ作り始める（開くたびに1回だけ）
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!open) {
      autoStarted.current = false;
      return;
    }
    if (autoAi && !autoStarted.current && canAi && !aiUrl && !file) {
      autoStarted.current = true;
      void makeWithAi();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 開いたとき・ミッションが読めたときだけ
  }, [open, autoAi, canAi]);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error(t("engage.oshi.notImage"));
      return;
    }
    setFile(f);
    setAiUrl(null);
  };

  const save = async () => {
    if (!file && !aiUrl) return;
    try {
      await upload.mutateAsync(aiUrl ? { imageUrl: aiUrl, isAi: true, itemId, caption } : { file, itemId, caption });
      // ミッションのグッズで撮ったら達成（サーバーが撮った写真で決める）。ポッケが喜ぶ
      if (missionItem && itemId === missionItem.id) {
        pockeCheer("missionDone", mission?.bonus ?? 0);
      }
      void queryClient.invalidateQueries({ queryKey: [DAILY_MISSION_KEY] });
      toast.success(
        todayDone ? t("engage.oshi.savedFirst") : streak > 0 ? t("engage.oshi.saved", { n: streak + 1 }) : t("engage.oshi.savedFirst"),
        { description: todayDone ? undefined : t("engage.oshi.savedPoints") }
      );
      reset();
      onOpenChange(false);
      onSaved?.(itemId);
    } catch (e) {
      const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "";
      console.error("oshi photo failed:", e);
      toast.error(message.includes("photo_limit") ? t("engage.oshi.limit") : t("engage.oshi.saveFailed"));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("engage.oshi.shootTitle")}</DialogTitle>
          <DialogDescription>{t("engage.oshi.shootDesc")}</DialogDescription>
        </DialogHeader>

        {/* 以前は capture 付きの入力1つだけで、スマホではカメラしか開けず、撮影済みの写真を選べなかった。
            「撮る」（カメラを直接開く）と「選ぶ」（アルバムから選ぶ）を分ける */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          data-testid="oshi-photo-camera"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          data-testid="oshi-photo-input"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {/* 写真の枠と「撮る / 選ぶ」は1つの塊にする（ダイアログの grid の中で aspect-square がボタンに重なっていた） */}
        <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/40",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
            (preview || aiUrl) && "border-solid"
          )}
        >
          {aiMaking ? (
            <span className="flex flex-col items-center gap-2 text-sm font-bold text-primary">
              <Pocke pose="think" height={88} motion="bob" />
              {t("pocke.mission.aiMaking")}
            </span>
          ) : aiUrl ? (
            <>
              <img src={aiUrl} alt="" className="h-full w-full object-cover" />
              <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-2xs font-bold">
                {t("pocke.mission.aiBadge")}
              </span>
            </>
          ) : preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-8 w-8" aria-hidden="true" />
              {t("engage.oshi.pickPhoto")}
            </span>
          )}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => cameraRef.current?.click()}>
            <Camera className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t("engage.oshi.cameraButton")}
          </Button>
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            <ImageIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t("engage.oshi.libraryButton")}
          </Button>
        </div>
        {/* 撮れない日は、ミッションのお題どおりの1枚を AI で作れる */}
        {canAi && (
          <Button type="button" variant="outline" className="border-points/40 text-points hover:bg-points/10" disabled={aiMaking} onClick={makeWithAi}>
            {aiMaking ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1.5 h-4 w-4" aria-hidden="true" />}
            {t("pocke.mission.aiFree", { n: mission?.ai_tries_left ?? 0 })}
          </Button>
        )}
        </div>

        {/* ミッションのグッズを選んでいるときは、お題を見せる */}
        {missionItem && itemId === missionItem.id && mission && (
          <p className="flex items-start gap-1.5 rounded-xl bg-points/10 px-3 py-2 text-xs font-bold text-points">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {t("pocke.mission.banner", { name: missionItem.title, action: t(`pocke.mission.prompts.${mission.prompt_id}.action`) })}
              <span className="ml-1 font-normal">{t("pocke.mission.reward", { n: mission.bonus })}</span>
            </span>
          </p>
        )}

        {(companions.length > 0 || missionItem) && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("engage.oshi.withWho")}</p>
            <div className="flex flex-wrap gap-1.5" role="group">
              <Chip active={itemId === null} onClick={() => setItemId(null)}>
                {t("engage.oshi.withNone")}
              </Chip>
              {missionItem && !companions.some((c) => c.user_item_id === missionItem.id) && (
                <Chip active={itemId === missionItem.id} onClick={() => setItemId(missionItem.id)}>
                  <span className="inline-block max-w-[9rem] truncate align-middle">{missionItem.title}</span>
                </Chip>
              )}
              {companions.map((c) => (
                <Chip key={c.user_item_id} active={itemId === c.user_item_id} onClick={() => setItemId(c.user_item_id)}>
                  <span className="inline-block max-w-[9rem] truncate align-middle">{c.title}</span>
                </Chip>
              ))}
            </div>
          </div>
        )}

        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 140))}
          placeholder={t("engage.oshi.captionPlaceholder")}
          rows={2}
          className="resize-none"
        />

        <Button size="lg" className="h-12 w-full rounded-2xl" disabled={(!file && !aiUrl) || aiMaking || upload.isPending} onClick={save}>
          {upload.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {upload.isPending ? t("engage.oshi.saving") : t("engage.oshi.save")}
        </Button>
        <Button variant="ghost" className="-mt-2 w-full" disabled={upload.isPending} onClick={() => { reset(); onOpenChange(false); }}>
          {t("chrome.common.cancel")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
      )}
    >
      {children}
    </button>
  );
}
