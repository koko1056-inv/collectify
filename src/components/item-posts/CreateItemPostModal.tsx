import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ImagePlus, X, Loader2, Wand2, Sparkles, Hash, Images } from "lucide-react";
import { cn } from "@/lib/utils";
import { PostTarget, useCreateItemPost } from "@/hooks/item-posts/useItemPosts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { SpendPointsDialog } from "@/components/shop/SpendPointsDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { AiCreationPicker } from "./AiCreationPicker";
import { getWeeklyPrompt } from "@/utils/weeklyPrompt";

const POST_IMAGE_COST = 50;

interface CreateItemPostModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  target: PostTarget;
  itemTitle: string;
  itemImage?: string | null;
  /** 作成できた投稿のID。シェアの導線などに使う */
  onCreated?: (postId: string) => void;
  /** お題などから開いたときの先頭ハッシュタグ（#は含まない） */
  initialTag?: string | null;
}

/** AI画像のプロンプトの出発点。ゼロから文章を考えなくてよいようにする */
const AI_PROMPT_PRESETS = ["altar", "scrapbook", "plush", "room"] as const;

/** コレクションアプリで実際によくある投稿の種類。選ぶとハッシュタグとして本文に入る */
const QUICK_TAGS = ["arrival", "complete", "trade", "seeking", "display"] as const;

const MAX_IMAGES = 4;

export function CreateItemPostModal({
  open,
  onOpenChange,
  target,
  itemTitle,
  itemImage,
  onCreated,
  initialTag,
}: CreateItemPostModalProps) {
  const { t } = useLanguage();
  const [caption, setCaption] = useState(initialTag ? `#${initialTag} ` : "");
  const [aiPickerOpen, setAiPickerOpen] = useState(false);
  const weeklyTag = getWeeklyPrompt().tag;
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createMutation = useCreateItemPost();
  const qc = useQueryClient();

  const requestGenerateAIImage = () => {
    if (!aiPrompt.trim()) {
      toast.error(t("social.itemPosts.promptRequired"));
      return;
    }
    if (images.length >= MAX_IMAGES) {
      toast.error(t("social.itemPosts.maxImages", { max: MAX_IMAGES }));
      return;
    }
    setConfirmOpen(true);
  };

  const generateAIImage = async () => {
    setConfirmOpen(false);
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-post-image", {
        body: { prompt: aiPrompt, itemTitle, itemImageUrl: itemImage },
      });
      if (error) {
        const msg = (error as any)?.context?.responseText
          ? (() => { try { return JSON.parse((error as any).context.responseText).error; } catch { return null; } })()
          : null;
        throw new Error(msg || error.message || t("social.itemPosts.generateFailed"));
      }
      if (!data?.imageUrl) throw new Error(data?.error || t("social.itemPosts.notGenerated"));

      const res = await fetch(data.imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `ai-${Date.now()}.png`, { type: "image/png" });
      const preview = URL.createObjectURL(file);
      setImages((prev) => [...prev, { file, preview }]);
      setAiPrompt("");
      qc.invalidateQueries({ queryKey: ["userPoints"] });
      qc.invalidateQueries({ queryKey: ["pointTransactions"] });
      toast.success(t("social.itemPosts.generateSuccess"));
    } catch (e) {
      toast.error((e as Error).message || t("social.itemPosts.generateFailed"));
    } finally {
      setIsGenerating(false);
    }
  };

  /** AIで作った画像（URL）を投稿画像に加える */
  const attachFromUrl = async (url: string) => {
    if (images.length >= MAX_IMAGES) {
      toast.error(t("social.itemPosts.maxImages", { max: MAX_IMAGES }));
      return;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      // "svg+xml" のような値がそのままファイル名に入らないよう、英数字だけにする
      const subtype = (blob.type.split("/")[1] || "png").split("+")[0];
      const ext = subtype === "jpeg" ? "jpg" : subtype.replace(/[^a-z0-9]/gi, "") || "png";
      const file = new File([blob], `ai-${Date.now()}.${ext}`, { type: blob.type || "image/png" });
      setImages((prev) => [...prev, { file, preview: URL.createObjectURL(file) }]);
    } catch {
      toast.error(t("engage.posts.aiAttachFailed"));
    }
  };

  const toggleTag = (tag: string) => {
    setCaption((prev) => {
      const token = `#${tag}`;
      if (prev.includes(token)) return prev.replace(token, "").replace(/\s{2,}/g, " ").trimStart();
      return prev.trim() ? `${prev.trimEnd()} ${token}` : `${token} `;
    });
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
    setCaption(initialTag ? `#${initialTag} ` : "");
    setAiPrompt("");
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    try {
      const post = await createMutation.mutateAsync({
        target,
        caption,
        images: images.map((i) => i.file),
      });
      reset();
      onOpenChange(false);
      onCreated?.(post.id);
    } catch {
      // Error toasted inside hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("social.itemPosts.createTitle")}</DialogTitle>
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
            <p className="text-xs text-muted-foreground">{t("social.itemPosts.target")}</p>
            <p className="text-sm font-medium truncate">{itemTitle}</p>
          </div>
        </div>

        {/* 画像選択 */}
        <div>
          <p className="text-sm font-medium mb-2">{t("social.itemPosts.imagesCount", { current: images.length, max: MAX_IMAGES })}</p>
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
                <span className="text-xs">{t("social.itemPosts.addImage")}</span>
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

        {/* AI画像生成 */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-primary" />
              {t("social.itemPosts.aiGenerate")}
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              {t("social.itemPosts.aiCost")}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t("social.itemPosts.aiDesc")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {AI_PROMPT_PRESETS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setAiPrompt(t(`engage.posts.aiPreset.${id}`))}
                disabled={isGenerating || createMutation.isPending}
                className="rounded-full border border-primary/30 bg-background px-2.5 py-1 text-[11px] text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                {t(`engage.posts.aiPresetLabel.${id}`)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={t("social.itemPosts.aiPlaceholder")}
              disabled={isGenerating || createMutation.isPending}
              maxLength={200}
              className="h-9"
            />
            <Button
              type="button"
              size="sm"
              onClick={requestGenerateAIImage}
              disabled={
                isGenerating ||
                createMutation.isPending ||
                !aiPrompt.trim() ||
                images.length >= MAX_IMAGES
              }
              className="gap-1.5 shrink-0"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              {t("social.itemPosts.generate")}
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAiPickerOpen(true)}
            disabled={createMutation.isPending || images.length >= MAX_IMAGES}
            className="h-8 w-full gap-1.5 text-xs text-primary hover:bg-primary/10"
          >
            <Images className="h-3.5 w-3.5" />
            {t("engage.posts.aiUseMine")}
          </Button>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">{t("social.itemPosts.commentOptional")}</p>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t("social.itemPosts.commentPlaceholder")}
            className="resize-none"
            rows={4}
            maxLength={500}
            disabled={createMutation.isPending}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[...QUICK_TAGS.map((id) => t(`engage.posts.quickTag.${id}`)), weeklyTag].map((tag, i, all) => {
              const active = caption.includes(`#${tag}`);
              const isWeekly = i === all.length - 1;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full border px-2.5 py-1 text-[11px]",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <Hash className="h-3 w-3" />
                  {tag}
                  {isWeekly && <span className="ml-1 opacity-70">{t("engage.posts.thisWeek")}</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{caption.length}/500</p>
        </div>

        {/* アクション */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createMutation.isPending}
            className="flex-1"
          >
            {t("social.itemPosts.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || images.length === 0}
            className="flex-1 gap-2"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("social.itemPosts.posting")}
              </>
            ) : (
              t("social.itemPosts.post")
            )}
          </Button>
        </div>

        <AiCreationPicker open={aiPickerOpen} onOpenChange={setAiPickerOpen} onPick={attachFromUrl} />

        <SpendPointsDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={t("social.itemPosts.confirmAiTitle")}
          description={t("social.itemPosts.confirmAiDesc", { title: itemTitle })}
          cost={POST_IMAGE_COST}
          loading={isGenerating}
          onConfirm={generateAIImage}
        />
      </DialogContent>
    </Dialog>
  );
}
