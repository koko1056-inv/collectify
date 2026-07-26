import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { useAvatars } from "@/hooks/useAvatars";
import { SpendPointsDialog } from "@/components/shop/SpendPointsDialog";
import { useFirstTimeFree } from "@/hooks/useFirstTimeFree";
import { useLanguage } from "@/contexts/LanguageContext";

const AVATAR_COST = 30;

const EXAMPLE_KEYS = [
  "misc.avatar.example1",
  "misc.avatar.example2",
  "misc.avatar.example3",
  "misc.avatar.example4",
];

export function GenerateTab({ avatars }: { avatars: ReturnType<typeof useAvatars> }) {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
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
    setProgress(20);
    setStep(t("misc.avatar.stepProcessing"));
    try {
      let imageBase64: string | undefined;
      if (uploadedImage) {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(uploadedImage);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
      }
      setProgress(40);
      setStep(t("misc.avatar.stepGenerating"));

      const { data, error } = await supabase.functions.invoke("generate-avatar", {
        body: {
          prompt:
            prompt.trim() ||
            "この写真を3Dアニメーションスタイルのキャラクターに変換してください",
          imageUrl: imageBase64,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error(t("misc.avatar.noImageUrl"));

      setProgress(70);
      setStep(t("misc.avatar.stepSaving"));
      await avatars.saveGenerated.mutateAsync({
        imageUrl: data.imageUrl,
        prompt: prompt.trim() || (uploadedImage ? "写真から生成" : "AIアバター"),
      });

      setProgress(100);
      setStep(t("misc.avatar.stepDone"));
      toast.success(t("misc.avatar.generateSuccess"));
      setPrompt("");
      handleRemove();
    } catch (e: any) {
      toast.error(e?.message ?? t("misc.avatar.generateFailed"));
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setStep("");
    }
  };

  return (
    <div className="space-y-4">
      {isGenerating && (
        <div className="p-4 rounded-xl bg-muted/40 border space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{step}</span>
          </div>
          <Progress value={progress} className="h-2" />
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

      <Button
        onClick={handleGenerateClick}
        disabled={isGenerating || (!prompt.trim() && !uploadedImage)}
        className="w-full h-12 text-base gap-2"
      >
        <Sparkles className="w-5 h-5" />
        {t("misc.avatar.generateBtn")}{" "}
        {isFirstTime
          ? t("misc.avatar.freeFirstBadge")
          : t("misc.avatar.costBadge", { cost: AVATAR_COST })}
      </Button>

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
