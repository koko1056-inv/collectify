import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, RefreshCw, Sparkles, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { useAvatars } from "@/hooks/useAvatars";
import { SpendPointsDialog } from "@/components/shop/SpendPointsDialog";
import { useFirstTimeFree } from "@/hooks/useFirstTimeFree";
import { useLanguage } from "@/contexts/LanguageContext";
import { consumePendingAvatarPrompt } from "@/utils/ai-studio-handoff";
import { downscaleToDataUrl } from "@/utils/downscale-image";

const AVATAR_COST = 30;

/** 目安の所要時間（秒）。これを超えたら文言を変えて「止まっていない」ことを伝える。 */
const EXPECTED_SECONDS = 45;

const EXAMPLE_KEYS = [
  "misc.avatar.example1",
  "misc.avatar.example2",
  "misc.avatar.example3",
  "misc.avatar.example4",
];

export function GenerateTab({
  avatars,
  onGoToGallery,
}: {
  avatars: ReturnType<typeof useAvatars>;
  /** 作ったアバターの一覧（ギャラリー）へ切り替える */
  onGoToGallery: () => void;
}) {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState("");

  // 探索から「このスタイルを使う」で来た場合はプロンプトを引き継ぐ
  useEffect(() => {
    const pending = consumePendingAvatarPrompt();
    if (pending?.prompt) setPrompt(pending.prompt);
  }, []);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** 直前に生成できたアバター。作った物をその場で見せるために保持する。 */
  const [lastResultUrl, setLastResultUrl] = useState<string | null>(null);

  // 経過秒数。以前は 20→40→70→100 の固定値を進捗バーに出していたが、
  // 実際の生成中はずっと40%のまま止まるため「壊れた」ように見えていた。
  useEffect(() => {
    if (!isGenerating) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isGenerating]);
  const { data: isFirstTime = false } = useFirstTimeFree({
    transactionTypes: ["avatar_generation", "avatar_generation_free"],
    extraTable: "avatar_gallery",
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setUploadedImage(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const handleRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setUploadedImage(null);
    setPreviewUrl(null);
  };

  const handleGenerateClick = () => {
    if (!prompt.trim() && !uploadedImage) {
      toast.error(t("misc.avatar.promptRequired"));
      return;
    }
    setConfirmOpen(true);
  };

  const handleGenerate = async () => {
    setConfirmOpen(false);
    setIsGenerating(true);
    setLastResultUrl(null);
    setStep(t("misc.avatar.stepProcessing"));
    try {
      let imageBase64: string | undefined;
      if (uploadedImage) {
        // スマホの写真をそのまま base64 にすると数MBの本文になり、
        // 送信に失敗したり極端に遅くなる。長辺1600pxまで縮めてから送る。
        imageBase64 =
          (await downscaleToDataUrl(uploadedImage)) ??
          (await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(uploadedImage);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          }));
      }
      setStep(t("misc.avatar.stepGenerating"));

      const { data, error } = await supabase.functions.invoke("generate-avatar", {
        body: {
          prompt: prompt.trim() || t("misc.avatar.photoOnlyPrompt"),
          imageUrl: imageBase64,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error(t("misc.avatar.noImageUrl"));

      setStep(t("misc.avatar.stepSaving"));
      await avatars.saveGenerated.mutateAsync({
        imageUrl: data.imageUrl,
        prompt: prompt.trim() || (uploadedImage ? t("misc.avatar.fromPhotoTitle") : t("misc.avatar.defaultTitle")),
      });

      setStep(t("misc.avatar.stepDone"));
      // できあがったものをその場で見せる。
      // 以前は通知を出すだけで、ギャラリータブに切り替えないと確認できなかった。
      setLastResultUrl(data.imageUrl);
      toast.success(t("misc.avatar.generateSuccess"));
      // 説明文は消さない。気に入らなかったときに書き直して作り直せるようにする。
      handleRemove();
    } catch (e) {
      // 生のエラー文（Edge Function のメッセージ）は利用者には意味がないので出さない
      console.error("avatar generation failed:", e);
      toast.error(t("misc.avatar.generateFailed"));
    } finally {
      setIsGenerating(false);
      setStep("");
    }
  };

  return (
    <div className="space-y-4">
      {isGenerating && (
        <div className="p-4 rounded-xl bg-muted/40 border space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{step}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {elapsed > EXPECTED_SECONDS
              ? t("misc.avatar.stillWorking")
              : t("misc.avatar.takesAWhile")}
            {" "}
            {t("misc.avatar.elapsed", { s: elapsed })}
          </p>
          <p className="text-xs text-muted-foreground/80">{t("misc.avatar.keepOpen")}</p>
        </div>
      )}

      {/* 直前に作れたアバター。作った物が見えないと「できたのか分からない」ため。 */}
      {!isGenerating && lastResultUrl && (
        <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Check className="h-4 w-4" />
            {t("misc.avatar.resultTitle")}
          </p>
          <img
            src={lastResultUrl}
            alt=""
            className="mx-auto max-h-56 w-auto rounded-lg border border-border object-contain"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleGenerateClick}>
              <RefreshCw className="h-3.5 w-3.5" />
              {t("misc.avatar.regenerate")}
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={onGoToGallery}>
              {t("misc.avatar.seeInGallery")}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          {t("misc.avatar.fromPhotoLabel")}
        </Label>
        {previewUrl ? (
          <div className="relative group">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-40 object-cover rounded-xl border-2 border-primary/30"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-2 left-2">
              <Badge variant="secondary" className="bg-background/80">
                {t("misc.avatar.convertNote")}
              </Badge>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground mt-2">{t("misc.avatar.clickToSelect")}</span>
            <Input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt">{t("misc.avatar.descLabel")}</Label>
        <Textarea
          id="prompt"
          placeholder={t("misc.avatar.descPlaceholder")}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs">{t("misc.avatar.quickSelect")}</Label>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_KEYS.map((exKey, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => setPrompt(t(exKey))}
              className="text-xs h-8"
            >
              {t(exKey)}
            </Button>
          ))}
        </div>
      </div>

      {/* 写真エリアと例文チップで縦に長くなり、生成ボタンが画面外に押し出されていた。
          主要な操作なので、スクロールしても常に手が届くようにする。 */}
      <div className="sticky bottom-0 -mx-1 bg-background/95 px-1 pb-1 pt-2 backdrop-blur">
        <Button
          onClick={handleGenerateClick}
          disabled={isGenerating || (!prompt.trim() && !uploadedImage)}
          className="w-full h-12 text-base gap-2"
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          {t("misc.avatar.generateBtn")}{" "}
          {isFirstTime
            ? t("misc.avatar.freeFirstBadge")
            : t("misc.avatar.costBadge", { cost: AVATAR_COST })}
        </Button>
      </div>

      <SpendPointsDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("misc.avatar.confirmTitle")}
        description={t("misc.avatar.confirmDesc")}
        cost={AVATAR_COST}
        freeTrial={isFirstTime}
        loading={isGenerating}
        onConfirm={handleGenerate}
      />
    </div>
  );
}
