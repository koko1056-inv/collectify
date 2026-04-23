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

const EXAMPLES = [
  "明るい笑顔、カジュアルな服装",
  "クールな雰囲気、眼鏡をかけている",
  "可愛い猫耳、カラフルな衣装",
  "優しい雰囲気、落ち着いた色の服",
];

export function GenerateTab({ avatars }: { avatars: ReturnType<typeof useAvatars> }) {
  const [prompt, setPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");

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

  const handleGenerate = async () => {
    if (!prompt.trim() && !uploadedImage) {
      toast.error("説明または写真を入力してください");
      return;
    }
    setIsGenerating(true);
    setProgress(20);
    setStep("画像を処理中...");
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
      setStep("AIがアバターを生成中...");

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
      if (!data?.imageUrl) throw new Error("画像URLが取得できませんでした");

      setProgress(70);
      setStep("アバターを保存中...");
      await avatars.saveGenerated.mutateAsync({
        imageUrl: data.imageUrl,
        prompt: prompt.trim() || (uploadedImage ? "写真から生成" : "AIアバター"),
      });

      setProgress(100);
      setStep("完了！");
      toast.success("🎉 アバター生成完了");
      setPrompt("");
      handleRemove();
    } catch (e: any) {
      toast.error(e?.message ?? "生成に失敗しました");
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
          写真から生成（オプション）
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
                3Dキャラクターに変換されます
              </Badge>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground mt-2">クリックで写真を選択</span>
            <Input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt">アバターの説明</Label>
        <Textarea
          id="prompt"
          placeholder="例：青い髪で眼鏡をかけた女の子..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs">クイック選択</Label>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => setPrompt(ex)}
              className="text-xs h-8"
            >
              {ex}
            </Button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || (!prompt.trim() && !uploadedImage)}
        className="w-full h-12 text-base gap-2"
      >
        <Sparkles className="w-5 h-5" />
        アバターを生成
      </Button>
    </div>
  );
}
