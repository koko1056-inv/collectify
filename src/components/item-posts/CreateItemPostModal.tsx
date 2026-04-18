import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ImagePlus, X, Loader2, Wand2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PostTarget, useCreateItemPost } from "@/hooks/item-posts/useItemPosts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateItemPostModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  target: PostTarget;
  itemTitle: string;
  itemImage?: string | null;
  onCreated?: () => void;
}

const MAX_IMAGES = 4;

export function CreateItemPostModal({
  open,
  onOpenChange,
  target,
  itemTitle,
  itemImage,
  onCreated,
}: CreateItemPostModalProps) {
  const [caption, setCaption] = useState("");
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createMutation = useCreateItemPost();

  const generateAIImage = async () => {
    if (!aiPrompt.trim()) {
      toast.error("生成したい画像の説明を入力してください");
      return;
    }
    if (images.length >= MAX_IMAGES) {
      toast.error(`画像は最大${MAX_IMAGES}枚までです`);
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-post-image", {
        body: { prompt: aiPrompt, itemTitle, itemImageUrl: itemImage },
      });
      if (error) throw error;
      if (!data?.imageUrl) throw new Error("画像が生成されませんでした");

      const res = await fetch(data.imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `ai-${Date.now()}.png`, { type: "image/png" });
      const preview = URL.createObjectURL(file);
      setImages((prev) => [...prev, { file, preview }]);
      setAiPrompt("");
      toast.success("画像を生成しました");
    } catch (e) {
      toast.error((e as Error).message || "画像生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_IMAGES - images.length;
    const selected = Array.from(files).slice(0, remaining);
    const newImages = selected.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const reset = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setCaption("");
    setAiPrompt("");
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    try {
      await createMutation.mutateAsync({
        target,
        caption,
        images: images.map((i) => i.file),
      });
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch {
      // Error toasted inside hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>投稿を作成</DialogTitle>
        </DialogHeader>

        {/* 対象グッズ情報 */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
          {itemImage && (
            <img
              src={itemImage}
              alt=""
              className="w-12 h-12 rounded-lg object-cover shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">投稿対象</p>
            <p className="text-sm font-medium truncate">{itemTitle}</p>
          </div>
        </div>

        {/* 画像選択 */}
        <div>
          <p className="text-sm font-medium mb-2">画像 ({images.length}/{MAX_IMAGES})</p>
          <div className="grid grid-cols-2 gap-2">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-lg overflow-hidden group"
              >
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  disabled={createMutation.isPending}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={createMutation.isPending}
                className={cn(
                  "aspect-square rounded-lg border-2 border-dashed border-border",
                  "flex flex-col items-center justify-center gap-1 text-muted-foreground",
                  "hover:border-primary hover:text-primary transition-colors"
                )}
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-xs">画像を追加</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
        </div>

        {/* キャプション */}
        <div>
          <p className="text-sm font-medium mb-2">コメント（任意）</p>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="みんなに共有したいこと、撮影のこだわり、推しポイント..."
            className="resize-none"
            rows={4}
            maxLength={500}
            disabled={createMutation.isPending}
          />
          <p className="text-[10px] text-muted-foreground text-right mt-1">
            {caption.length}/500
          </p>
        </div>

        {/* アクション */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createMutation.isPending}
            className="flex-1"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || images.length === 0}
            className="flex-1 gap-2"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                投稿中...
              </>
            ) : (
              "投稿する"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
