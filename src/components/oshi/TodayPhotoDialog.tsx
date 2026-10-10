import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanions, useOshiPhotos, useUploadOshiPhoto } from "@/hooks/useOshi";
import { cn } from "@/lib/utils";

interface TodayPhotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 最初から選んでおく相棒（user_item_id） */
  initialItemId?: string | null;
}

/** 今日の推しフォトを撮る（または選ぶ）。相棒を選ぶと、その相棒が +3xp */
export function TodayPhotoDialog({ open, onOpenChange, initialItemId = null }: TodayPhotoDialogProps) {
  const { t } = useLanguage();
  const { data: companions = [] } = useCompanions();
  const { streak, todayDone } = useOshiPhotos();
  const upload = useUploadOshiPhoto();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(initialItemId);
  const [caption, setCaption] = useState("");

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
    setCaption("");
  };

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error(t("engage.oshi.notImage"));
      return;
    }
    setFile(f);
  };

  const save = async () => {
    if (!file) return;
    try {
      await upload.mutateAsync({ file, itemId, caption });
      toast.success(
        todayDone ? t("engage.oshi.savedFirst") : streak > 0 ? t("engage.oshi.saved", { n: streak + 1 }) : t("engage.oshi.savedFirst"),
        { description: todayDone ? undefined : t("engage.oshi.savedPoints") }
      );
      reset();
      onOpenChange(false);
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

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          data-testid="oshi-photo-input"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/40",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
            preview && "border-solid"
          )}
        >
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Camera className="h-8 w-8" aria-hidden="true" />
              {t("engage.oshi.takePhoto")}
            </span>
          )}
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mx-auto -mt-1 text-xs text-muted-foreground underline"
          >
            {t("engage.oshi.retake")}
          </button>
        )}

        {companions.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("engage.oshi.withWho")}</p>
            <div className="flex flex-wrap gap-1.5" role="group">
              <Chip active={itemId === null} onClick={() => setItemId(null)}>
                {t("engage.oshi.withNone")}
              </Chip>
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

        <Button size="lg" className="h-12 w-full rounded-2xl" disabled={!file || upload.isPending} onClick={save}>
          {upload.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {upload.isPending ? t("engage.oshi.saving") : t("engage.oshi.save")}
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
