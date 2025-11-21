import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";

interface AvatarGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarGenerated: (imageUrl: string) => void;
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
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "アバターの説明を入力してください",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-avatar", {
        body: { prompt: prompt.trim() },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.imageUrl) {
        throw new Error("画像URLが取得できませんでした");
      }

      onAvatarGenerated(data.imageUrl);
      toast({
        title: "アバター生成完了",
        description: "AIアバターが生成されました",
      });
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
    }
  };

  const useExamplePrompt = (examplePrompt: string) => {
    setPrompt(examplePrompt);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AIアバター生成
          </DialogTitle>
          <DialogDescription>
            あなたの理想のアバターを説明してください。AIが3D風のアバター画像を生成します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">アバターの説明</Label>
            <Textarea
              id="prompt"
              placeholder="例：若い女性、明るい笑顔、ピンクの髪、カジュアルな服装"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
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
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
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
