import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ImagePlus, X, Loader2, Wand2, Sparkles, Hash, Images, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { POST_CAPTION_MAX, PostTarget, useCreateItemPost } from "@/hooks/item-posts/useItemPosts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { SpendPointsDialog } from "@/components/shop/SpendPointsDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { AiCreationPicker } from "./AiCreationPicker";
import { getWeeklyPrompt } from "@/utils/weeklyPrompt";
import { useAiCosts } from "@/hooks/useAiCosts";

interface CreateItemPostModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** 投稿に付けるグッズ。null ならグッズなし（X のような文字だけの投稿も書ける） */
  target: PostTarget | null;
  itemTitle: string;
  itemImage?: string | null;
  /** 作成できた投稿のID。シェアの導線などに使う */
  onCreated?: (postId: string) => void;
  /** お題などから開いたときの先頭ハッシュタグ（#は含まない） */
  initialTag?: string | null;
  /** 書き出しの文（グッズのページの話題のチップから開いたとき）。ハッシュタグの後に入る */
  initialText?: string | null;
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
  initialText,
}: CreateItemPostModalProps) {
  const { t } = useLanguage();
  // サブスクの人は割引後の値段（正はサーバー）
  const POST_IMAGE_COST = useAiCosts().costs.postImage;
  const [caption, setCaption] = useState(`${initialTag ? `#${initialTag} ` : ""}${initialText ?? ""}`);
  const [aiPickerOpen, setAiPickerOpen] = useState(false);
  // AI で画像を作る欄は、既定では1行に畳む。投稿の本題は「自分のグッズの写真」で、
  // 以前は写真の欄と同じ大きさの AI の欄が常に開いていて、投稿が AI 画像を作る場所に見えていた
  const [aiOpen, setAiOpen] = useState(false);
  const weeklyTag = getWeeklyPrompt().tag;
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasImages = images.length > 0;
  // 写真がないときは本文が必須（空の投稿は出さない）
  const canSubmit = hasImages || caption.trim().length > 0;
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
      toast.success(t("social.itemPosts.generateSuccess", { cost: POST_IMAGE_COST }));
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
    setCaption(`${initialTag ? `#${initialTag} ` : ""}${initialText ?? ""}`);
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

        {/* 対象グッズ情報（グッズなしのときは、文字だけの投稿だと分かる1行） */}
        {target ? (
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
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <PenLine className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t("social.itemPosts.noGoodsTarget")}
          </div>
        )}

        {/* 画像選択 */}
        <div>
          <p className="text-sm font-medium mb-2">{t("social.itemPosts.photosOptional", { current: images.length, max: MAX_IMAGES })}</p>
          {/* 写真がまだないときは、文字だけでも投稿できるよう、追加の枠を低い1行にする（選んだあとは今までどおりのマス） */}
          {!hasImages ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={createMutation.isPending}
              data-testid="post-add-photo"
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-border px-3 py-3 text-left text-muted-foreground",
                "hover:border-primary hover:text-primary transition-colors"
              )}
            >
              <ImagePlus className="h-6 w-6 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t("social.itemPosts.addImage")}</span>
                <span className="block text-2xs">{t("social.itemPosts.photosOptionalHint")}</span>
              </span>
            </button>
          ) : (
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
          )}
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

        {/* AI画像生成（畳んだ1行から開く）。グッズを題材に作るので、グッズなしの投稿では出さない */}
        {!target ? null : !aiOpen ? (
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            data-testid="post-ai-open"
            className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="flex-1">{t("social.itemPosts.aiGenerate")}</span>
            <span className="text-3xs">{t("social.itemPosts.aiCost", { cost: POST_IMAGE_COST })}</span>
          </button>
        ) : (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-primary" />
              {t("social.itemPosts.aiGenerate")}
            </div>
            <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              {t("social.itemPosts.aiCost", { cost: POST_IMAGE_COST })}
            </span>
          </div>
          <p className="text-2xs text-muted-foreground">
            {t("social.itemPosts.aiDesc")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {AI_PROMPT_PRESETS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setAiPrompt(t(`engage.posts.aiPreset.${id}`))}
                disabled={isGenerating || createMutation.isPending}
                className="rounded-full border border-primary/30 bg-background px-2.5 py-1 text-2xs text-primary hover:bg-primary/10 disabled:opacity-50"
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
        )}

        <div>
          <label htmlFor="post-caption" className="mb-2 block text-sm font-medium">
            {hasImages ? t("social.itemPosts.commentOptional") : t("social.itemPosts.bodyRequired")}
          </label>
          <Textarea
            id="post-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={hasImages ? t("social.itemPosts.commentPlaceholder") : t("social.itemPosts.textPlaceholder")}
            className="resize-none"
            // 文字だけのときは本文が主役なので、少し高くする
            rows={hasImages ? 4 : 6}
            maxLength={POST_CAPTION_MAX}
            autoFocus={!target}
            disabled={createMutation.isPending}
            data-testid="post-caption"
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
                    "inline-flex items-center gap-0.5 rounded-full border px-2.5 py-1 text-2xs",
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
          <CharCounter count={caption.length} max={POST_CAPTION_MAX} />
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
            disabled={createMutation.isPending || !canSubmit}
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

/** 残りの文字数の輪（X と同じ）。残りが少なくなったら数字を出し、色を変える */
function CharCounter({ count, max }: { count: number; max: number }) {
  const { t } = useLanguage();
  const left = max - count;
  const near = left <= 50;
  const R = 9;
  const C = 2 * Math.PI * R;
  const progress = Math.min(1, count / max);
  const tone = left <= 0 ? "text-destructive" : left <= 20 ? "text-warning" : "text-primary";
  return (
    <div className="mt-1 flex items-center justify-end gap-1.5 pr-1" data-testid="post-char-counter">
      {near && (
        <span aria-hidden="true" className={cn("text-2xs tabular-nums", left <= 20 ? tone : "text-muted-foreground")}>
          {left}
        </span>
      )}
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="-rotate-90">
        <circle cx="11" cy="11" r={R} fill="none" strokeWidth="2" className="stroke-border" />
        {count > 0 && (
          <circle
            cx="11"
            cy="11"
            r={R}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            className={cn("stroke-current transition-[stroke-dashoffset] duration-150", tone)}
          />
        )}
      </svg>
      <span className="shrink-0 whitespace-nowrap text-3xs tabular-nums text-muted-foreground">
        {count}/{max}
      </span>
      <span className="sr-only" aria-live="polite">
        {near ? t("social.itemPosts.charsLeft", { n: left }) : ""}
      </span>
    </div>
  );
}
