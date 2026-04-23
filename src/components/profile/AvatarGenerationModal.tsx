import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, Upload, X, Wand2, Coins } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { AvatarGenerationResult } from "@/types/avatar";
import { useUserPoints } from "@/hooks/usePoints";
import { SpendPointsDialog } from "@/components/shop/SpendPointsDialog";
import { useFirstTimeFree } from "@/hooks/useFirstTimeFree";
import { useQueryClient } from "@tanstack/react-query";

const GENERATION_COST = 30;

interface AvatarGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarGenerated: (result: AvatarGenerationResult) => void | Promise<void>;
}

const EXAMPLE_PROMPTS = [
  "若い女性、明るい笑顔、カジュアルな服装、ピンク系のカラフルな髪",
  "クールな男性、短髪、眼鏡をかけている、青系の衣装",
  "可愛い猫耳の女の子、大きな瞳、カラフルなファンタジー衣装",
  "優しい雰囲気の男性、長髪、落ち着いた色の服装",
];

export function AvatarGenerationModal({ isOpen, onClose, onAvatarGenerated }: AvatarGenerationModalProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();
  const { data: userPoints } = useUserPoints();
  const { data: isFirstTime = false } = useFirstTimeFree({
    transactionTypes: ["avatar_generation", "avatar_generation_free"],
    extraTable: "avatar_gallery",
  });
  const qc = useQueryClient();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setUploadedImage(null);
    setPreviewUrl(null);
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleGenerateClick = () => {
    if (!prompt.trim() && !uploadedImage) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "アバターの説明または写真を入力してください",
      });
      return;
    }
    setConfirmOpen(true);
  };

  const handleGenerate = async () => {
    setConfirmOpen(false);
    setIsGenerating(true);
    setProgress(0);
    setGenerationStep("準備中...");

    try {
      // ポイント消費は Edge Function 側で一元管理（初回無料含む）

      // ステップ1: 画像変換
      setProgress(20);
      setGenerationStep("画像を処理中...");
      let imageBase64: string | undefined;
      if (uploadedImage) {
        imageBase64 = await convertImageToBase64(uploadedImage);
      }

      // ステップ2: AI生成開始
      setProgress(20);
      setGenerationStep("画像を処理中...");
      let imageBase64: string | undefined;
      if (uploadedImage) {
        imageBase64 = await convertImageToBase64(uploadedImage);
      }

      // ステップ2: AI生成開始
      setProgress(40);
      setGenerationStep("AIアバターを生成中...");
      
      const { data, error } = await supabase.functions.invoke("generate-avatar", {
        body: { 
          prompt: prompt.trim() || "この写真を3Dアニメーションスタイルのキャラクターに変換してください",
          imageUrl: imageBase64 
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.imageUrl) {
        throw new Error("画像URLが取得できませんでした");
      }

      // ステップ3: 保存中（呼び出し元に処理を委譲）
      setProgress(70);
      setGenerationStep("アバターを保存中...");

      const usedPrompt = prompt.trim() || (uploadedImage ? "写真から生成したアバター" : "AIアバター");
      await onAvatarGenerated({ imageUrl: data.imageUrl, prompt: usedPrompt });

      // ステップ4: 完了
      setProgress(100);
      setGenerationStep("完了！");

      toast({
        title: "アバター生成完了",
        description: "AIアバターが生成されました",
      });
      setPrompt("");
      handleRemoveImage();
      onClose();
    } catch (error: any) {
      console.error("Avatar generation error:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: error.message || "アバター生成に失敗しました",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setGenerationStep("");
    }
  };

  const useExamplePrompt = (examplePrompt: string) => {
    setPrompt(examplePrompt);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AIアバター生成
            <span className="ml-auto flex items-center gap-1 text-sm font-normal text-muted-foreground">
              <Coins className="w-4 h-4" />
              {GENERATION_COST}pt
            </span>
          </DialogTitle>
          <DialogDescription>
            あなたの理想のアバターを説明してください。AIが3D風のアバター画像を生成します。
            <span className="block mt-1 text-xs">
              現在のポイント: <span className="font-medium text-foreground">{userPoints?.total_points || 0}pt</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        {isGenerating && (
          <div className="space-y-4 py-6 px-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg border border-primary/20 animate-fade-in">
            <div className="flex items-center justify-center gap-3">
              <Wand2 className="w-6 h-6 text-primary animate-pulse" />
              <p className="text-lg font-medium text-primary">{generationStep}</p>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              高品質な3Dアバターを生成しています...
            </p>
          </div>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>自分の写真をアップロード（オプション）</Label>
            {previewUrl ? (
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-48 object-cover rounded-lg border-2 border-border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                  disabled={isGenerating}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">クリックして写真を選択</span>
                <span className="text-xs text-muted-foreground mt-1">3Dキャラクターに変換されます</span>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isGenerating}
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">追加の指示（オプション）</Label>
            <Textarea
              id="prompt"
              placeholder="例：青い髪にしてください、眼鏡をかけてください..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="resize-none"
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label>サンプルプロンプト</Label>
            <div className="grid grid-cols-1 gap-2">
              {EXAMPLE_PROMPTS.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => useExamplePrompt(example)}
                  className="text-left justify-start h-auto py-2 px-3 whitespace-normal"
                  disabled={isGenerating}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isGenerating}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || (!prompt.trim() && !uploadedImage)}
              className="relative overflow-hidden group"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4 group-hover:animate-pulse" />
                  生成
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
