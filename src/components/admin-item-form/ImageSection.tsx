
import { useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, ClipboardPaste, Download, Images, Link2, Loader2, PenLine, RotateCcw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Pocke, PockeBubble, PockeSays } from "@/components/pocke/Pocke";
import { CameraScanArt, ManualFormArt } from "@/components/collection/AddGoodsArt";
import { GachaSplitArt, PageExampleArt, SaveImageArt, UrlImportArt } from "./AddMethodArt";
import { looksLikeGacha } from "./gachaHint";
import { readFunctionsRateLimit } from "@/lib/functionsRateLimit";
import { cn } from "@/lib/utils";

export interface AnalysisResult {
  title: string;
  description: string;
  price: string;
  category: string;
  contentName: string;
  characterName: string;
  selectedImages?: Array<{
    url: string;
    title: string | null;
  }>;
}

/** URL から読み込んで、画像と名前を確かめた1件 */
export interface UrlImportResult {
  imageUrl: string;
  title: string;
  sourceUrl: string;
}

interface ImageSectionProps {
  imageFile: File | null;
  setImageFile: (file: File | null) => void;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
  onAnalysisComplete?: (result: AnalysisResult) => void;
  /** 「自分で入力」。URL の読み込みに失敗して来たときは、そのURLを引き継ぐ */
  onManual?: (keptUrl?: string) => void;
  /** URL から読み込んだ画像と名前で、詳細の入力へ進む */
  onUrlImported?: (result: UrlImportResult) => void;
  /** 前に読み込もうとしたURL（詳細の画面から戻ってきたときに入れ直す） */
  initialUrl?: string;
}

type Method = "choose" | "photo" | "url" | "web";
type UrlStatus = "idle" | "loading" | "found" | "failed" | "limited";
type ScrapedImage = { url: string; title: string | null };

/** ロゴ・アイコン・バナーらしい画像は後ろへ回す（ページの先頭にあることが多く、グッズの写真ではない） */
const NOT_GOODS_IMAGE = /logo|icon|sprite|banner|badge|btn|button|avatar|loading|spacer|\.svg(\?|$)/i;
function rankImages(images: ScrapedImage[]): ScrapedImage[] {
  const seen = new Set<string>();
  const list = images.filter((i) => i?.url && !seen.has(i.url) && seen.add(i.url));
  return [...list.filter((i) => !NOT_GOODS_IMAGE.test(i.url)), ...list.filter((i) => NOT_GOODS_IMAGE.test(i.url))];
}

/**
 * 日本語の文言を「、」「。」「・」「？」と \u200b（折り返してよい位置の印）の後ろでだけ折り返す。
 * 幅の狭いカードで「画像と名前が自動で／入るよ」のように言葉の途中で切れないように（AddGoodsSheet と同じ考え方）。
 */
function phrases(text: string) {
  const parts = text.split(/(?<=[、。・？\u200b])/);
  if (parts.length < 2) return text;
  return parts.map((p, i) => (
    <span key={i} className="inline-block">
      {p}
    </span>
  ));
}

/**
 * /add-item（カタログにない・自作グッズ）の最初の画面。
 *
 * 以前は A/B/C の同じ形の枠（写真・Webサイトから取得・画像URL）が縦に並び、読み比べないと違いがわからなかった。
 * ここでは
 *  - 最初に「写真を撮る・選ぶ／サイトのURLを貼る／自分で入力」を絵つきの大きいカードで選んでもらう
 *  - URL の読み込み（scrape-images）はログインしている人なら誰でも使える（1時間・1日の回数制限つき。管理者は対象外）
 *  - 読み込めないページのために「画像を保存して写真から選ぶ」道筋（web）も、URL の画面と失敗の画面から開ける
 *  - 待つ間・失敗・回数制限はポッケが伝える。失敗したらワンタップで手入力・写真へ（URLは引き継ぐ）
 *  - 読み込めたら、画像と名前（ページの名前）を確かめて（直して）から次へ進む
 */
export function ImageSection({
  imageFile,
  setImageFile,
  previewUrl,
  setPreviewUrl,
  onAnalysisComplete,
  onManual,
  onUrlImported,
  initialUrl = "",
}: ImageSectionProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  // 画像が既にある（詳細から戻ってきた）ときは、その写真の画面から始める
  const [method, setMethod] = useState<Method>(previewUrl ? "photo" : initialUrl ? "url" : "choose");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 「何枚か選んでまとめて登録」は管理者（カタログ整備）向け。ProtectedRoute と同じキーで確かめる
  const { data: isAdmin = false } = useQuery({
    queryKey: ["has-role", "admin", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      if (error) throw error;
      return data === true;
    },
  });

  // ---- 写真 ----
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [imageUrlInput, setImageUrlInput] = useState("");

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setAiStatus("idle");
      setMethod("photo");
    }
  };
  const pickPhoto = () => fileInputRef.current?.click();

  const handleAnalyzeImage = async () => {
    if (!previewUrl) return;
    setAiStatus("loading");
    try {
      let imageUrl = previewUrl;
      if (previewUrl.startsWith("blob:")) {
        const response = await fetch(previewUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        imageUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
      const { data, error } = await supabase.functions.invoke("analyze-item-image", {
        body: { imageUrl },
      });
      if (error) throw error;
      if (data && onAnalysisComplete) onAnalysisComplete(data);
      setAiStatus(data?.title ? "done" : "failed");
    } catch (error) {
      console.error("Error analyzing image:", error);
      setAiStatus("failed");
    }
  };

  // 画像のアドレスを直接入れる（以前の「画像URLを直接設定」。使う人は少ないので畳んでおく）
  const handleSetImageUrl = async () => {
    if (!imageUrlInput) {
      toast.error(t("common.error"), { description: t("addItem.enterImageUrl") });
      return;
    }
    try {
      const img = new Image();
      img.onload = async () => {
        try {
          const response = await fetch(imageUrlInput);
          const blob = await response.blob();
          const urlParts = imageUrlInput.split("/");
          const fileName = urlParts[urlParts.length - 1] || "image.jpg";
          const file = new File([blob], fileName, { type: blob.type });
          handleImageChange(file);
          setImageUrlInput("");
          toast.success(t("addItem.imageSet"), { description: t("addItem.imageSetDesc") });
        } catch (error) {
          console.error("Error fetching image:", error);
          toast.error(t("common.error"), { description: t("addItem.imageFetchError") });
        }
      };
      img.onerror = () => {
        toast.error(t("common.error"), { description: t("addItem.invalidImageUrl") });
      };
      img.src = imageUrlInput;
    } catch (error) {
      console.error("Error setting image URL:", error);
      toast.error(t("common.error"), { description: t("addItem.imageSetError") });
    }
  };

  // ---- URL から読み込む ----
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [urlStatus, setUrlStatus] = useState<UrlStatus>("idle");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [failKind, setFailKind] = useState<"empty" | "fetch">("fetch");
  const [limitedBy, setLimitedBy] = useState<"hour" | "day">("hour");
  const [scrapedImages, setScrapedImages] = useState<ScrapedImage[]>([]);
  const [chosenImage, setChosenImage] = useState<string | null>(null);
  const [importName, setImportName] = useState("");
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [showImageSelector, setShowImageSelector] = useState(false);
  const canPaste = typeof navigator !== "undefined" && !!navigator.clipboard?.readText;

  const pasteUrl = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) {
        setUrlInput(text);
        setUrlError(null);
      }
    } catch {
      // 読み取りを断られたときは、自分で貼ってもらう
    }
  };

  const handleScrapeImages = async () => {
    const url = urlInput.trim();
    // scrape-images は https のページだけを読む。送る前に形だけ確かめて、やさしく伝える
    if (!/^https:\/\/[^\s/]+\.[^\s]+/i.test(url)) {
      setUrlError(t("chrome.adminForm.url.invalid"));
      return;
    }
    setUrlError(null);
    setUrlStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("scrape-images", {
        body: { url },
      });
      if (error) throw error;
      const images = rankImages(data?.images ?? []);
      if (images.length === 0) {
        setFailKind("empty");
        setUrlStatus("failed");
        return;
      }
      setScrapedImages(images);
      setChosenImage(images[0].url);
      // 名前はページの名前（og:title など）を優先し、無ければ画像の alt
      const pageTitle = typeof data?.title === "string" ? data.title.trim() : "";
      setImportName(pageTitle || images.find((i) => i.title)?.title || "");
      setUrlStatus("found");
    } catch (error) {
      // 回数制限（429）は失敗ではないので、こわい文言にせず「少し休んでね」と伝える
      const limited = await readFunctionsRateLimit(error);
      if (limited) {
        setLimitedBy(limited.limitedBy);
        setUrlStatus("limited");
        return;
      }
      console.error("Error scraping images:", error);
      setFailKind("fetch");
      setUrlStatus("failed");
    }
  };

  const resetUrl = () => {
    setUrlStatus("idle");
    setScrapedImages([]);
    setChosenImage(null);
    setImportName("");
  };

  const toggleImageSelection = (imageUrl: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(imageUrl)) next.delete(imageUrl);
      else next.add(imageUrl);
      return next;
    });
  };

  // まとめて登録（管理者のカタログ整備向け。以前の「複数選択して一括登録」はここに残す）
  const handleConfirmSelection = () => {
    if (selectedImages.size === 0) {
      toast.error(t("common.error"), { description: t("addItem.selectAtLeastOne") });
      return;
    }
    const selectedImagesData = scrapedImages.filter((img) => selectedImages.has(img.url));
    onAnalysisComplete?.({
      title: "",
      description: "",
      price: "",
      category: "",
      contentName: "",
      characterName: "",
      selectedImages: selectedImagesData,
    });
    setShowImageSelector(false);
    setSelectedImages(new Set());
  };

  const backToChoose = () => {
    setMethod("choose");
    setUrlError(null);
    if (urlStatus !== "loading") resetUrl();
  };

  const backLink = (
    <button
      type="button"
      onClick={backToChoose}
      className="-ml-1 inline-flex min-h-9 items-center gap-0.5 rounded-md px-1 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      {t("chrome.adminForm.method.back")}
    </button>
  );

  return (
    <>
      {/* どの画面からでも使う写真の選択（カメラ・写真ライブラリ）。ボタンから開く */}
      <input
        ref={fileInputRef}
        id="fileUpload"
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) handleImageChange(e.target.files[0]);
          e.target.value = "";
        }}
      />

      {method === "choose" && (
        <div className="space-y-4" data-add-method="choose">
          <PockeSays pose="point" height={64}>
            {phrases(t("chrome.adminForm.method.pokke"))}
          </PockeSays>

          <div className="space-y-3">
            <MethodCard
              art={<CameraScanArt />}
              title={t("chrome.adminForm.method.photoTitle")}
              lead={t("chrome.adminForm.method.photoLead")}
              tone="primary"
              onClick={pickPhoto}
            />
            <MethodCard
              art={<UrlImportArt />}
              title={t("chrome.adminForm.method.urlTitle")}
              lead={t("chrome.adminForm.method.urlLead")}
              tone="primary"
              onClick={() => setMethod("url")}
            />
            <MethodCard
              art={<ManualFormArt />}
              title={t("chrome.adminForm.method.manualTitle")}
              lead={t("chrome.adminForm.method.manualLead")}
              tone="muted"
              onClick={() => onManual?.()}
            />
          </div>

          <ImageUrlField value={imageUrlInput} onChange={setImageUrlInput} onSubmit={handleSetImageUrl} />
        </div>
      )}

      {method === "photo" && (
        <div className="space-y-4" data-add-method="photo">
          {backLink}
          {previewUrl ? (
            <>
              <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-2xl border bg-muted/40">
                <img src={previewUrl} alt={t("addItem.imagePreview")} className="mx-auto max-h-72 w-full object-contain" />
              </div>
              <div className="flex justify-center">
                <Button type="button" variant="ghost" size="sm" onClick={pickPhoto} className="h-9 gap-1.5 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("chrome.adminForm.photo.change")}
                </Button>
              </div>

              {aiStatus === "loading" ? (
                <PockeWaiting text={t("chrome.adminForm.photo.reading")} />
              ) : aiStatus === "done" ? (
                <PockeSays pose="wink" height={56}>
                  {t("chrome.adminForm.photo.aiDone")}
                </PockeSays>
              ) : aiStatus === "failed" ? (
                <PockeSays pose="sad" height={56}>
                  {t("chrome.adminForm.photo.aiFailed")}
                </PockeSays>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAnalyzeImage}
                  className="h-11 w-full gap-2 rounded-xl border-primary/40 font-bold text-primary"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {t("chrome.adminForm.photo.aiRead")}
                </Button>
              )}
            </>
          ) : (
            <Button type="button" onClick={pickPhoto} className="h-12 w-full gap-2 rounded-xl font-bold">
              <Images className="h-4 w-4" aria-hidden="true" />
              {t("chrome.adminForm.photo.pick")}
            </Button>
          )}
        </div>
      )}

      {method === "web" && (
        <div className="space-y-4" data-add-method="web">
          {backLink}
          <PockeSays pose="think" height={64}>
            {t("chrome.adminForm.web.pokke")}
          </PockeSays>
          <div className="flex justify-center rounded-2xl bg-primary/5 py-3 ring-1 ring-inset ring-primary/10">
            <SaveImageArt />
          </div>
          <ol className="space-y-2">
            {[t("chrome.adminForm.web.step1"), t("chrome.adminForm.web.step2"), t("chrome.adminForm.web.step3")].map((text, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-2xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="min-w-0">{text}</span>
              </li>
            ))}
          </ol>
          <Button type="button" onClick={pickPhoto} className="h-12 w-full gap-2 rounded-xl font-bold">
            <Images className="h-4 w-4" aria-hidden="true" />
            {t("chrome.adminForm.web.pick")}
          </Button>
          <div className="flex justify-center">
            <Button type="button" variant="link" size="sm" className="h-9 px-1 text-xs" onClick={() => setMethod("url")}>
              <Link2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              {t("chrome.adminForm.web.toUrl")}
            </Button>
          </div>
        </div>
      )}

      {method === "url" && (
        <div className="space-y-4" data-add-method="url" data-url-status={urlStatus}>
          {backLink}

          {urlStatus === "idle" && (
            <>
              <PockeSays pose="point" height={64}>
                {t("chrome.adminForm.url.pokke")}
              </PockeSays>
              <div className="flex justify-center rounded-2xl bg-primary/5 py-3 ring-1 ring-inset ring-primary/10">
                <UrlImportArt className="h-20 w-[9.5rem]" />
              </div>

              <div className="space-y-2">
                <label htmlFor="url" className="text-sm font-bold">
                  {t("chrome.adminForm.url.label")}
                </label>
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="url"
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        setUrlError(null);
                      }}
                      onKeyDown={(e) => {
                        // フォームの送信（登録）にならないように、Enter は読み込みにする
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleScrapeImages();
                        }
                      }}
                      placeholder="https://..."
                      aria-invalid={!!urlError}
                      className="h-11 pl-9 text-sm"
                    />
                  </div>
                  {canPaste && (
                    <Button type="button" variant="outline" onClick={pasteUrl} className="h-11 shrink-0 gap-1 px-3 text-xs">
                      <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
                      {t("chrome.adminForm.url.paste")}
                    </Button>
                  )}
                </div>
                {urlError && <p className="text-xs text-destructive">{urlError}</p>}
              </div>

              <Button
                type="button"
                onClick={handleScrapeImages}
                disabled={!urlInput.trim()}
                className="h-12 w-full gap-2 rounded-xl font-bold"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {t("chrome.adminForm.url.load")}
              </Button>

              {/* どんなページならうまくいくか。見本の絵で */}
              <div className="grid grid-cols-2 gap-2">
                <PageExample kind="good" title={t("chrome.adminForm.url.goodTitle")} example={t("chrome.adminForm.url.goodExample")} />
                <PageExample kind="bad" title={t("chrome.adminForm.url.badTitle")} example={t("chrome.adminForm.url.badExample")} />
              </div>
              <WebHelpLink onClick={() => setMethod("web")} />
            </>
          )}

          {urlStatus === "loading" && (
            <>
              <PockeWaiting text={t("chrome.adminForm.url.loading")} />
              <div className="space-y-3 rounded-2xl border bg-card p-3" aria-hidden="true">
                <Skeleton className="mx-auto aspect-square w-full max-w-[14rem] rounded-xl" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <div className="flex gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-14 rounded-lg" />
                  ))}
                </div>
              </div>
            </>
          )}

          {urlStatus === "found" && chosenImage && (
            <>
              <PockeSays pose="wink" height={56}>
                {t("chrome.adminForm.url.foundTitle")}
              </PockeSays>
              <div className="space-y-3 rounded-2xl border bg-card p-3 shadow-sm">
                <div className="mx-auto aspect-square w-full max-w-[14rem] overflow-hidden rounded-xl bg-muted/50">
                  <img src={chosenImage} alt="" className="h-full w-full object-contain" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="import-name" className="text-xs font-bold text-muted-foreground">
                    {t("chrome.adminForm.url.nameLabel")}
                  </label>
                  <Input
                    id="import-name"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                    placeholder={t("chrome.adminForm.url.namePlaceholder")}
                    className="h-11 text-sm"
                  />
                </div>
                {scrapedImages.length > 1 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-muted-foreground">
                      {t("chrome.adminForm.url.otherImages", { n: scrapedImages.length })}
                    </p>
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
                      {scrapedImages.slice(0, 24).map((img, i) => {
                        const on = img.url === chosenImage;
                        return (
                          <button
                            key={img.url}
                            type="button"
                            aria-pressed={on}
                            aria-label={img.title ?? t("chrome.adminForm.url.imageN", { n: i + 1 })}
                            onClick={() => setChosenImage(img.url)}
                            className={cn(
                              "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-muted/50",
                              on ? "border-primary" : "border-transparent"
                            )}
                          >
                            <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                            {on && (
                              <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="h-3 w-3" aria-hidden="true" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <GachaHint strong={looksLikeGacha(importName)} />

              <Button
                type="button"
                onClick={() => onUrlImported?.({ imageUrl: chosenImage, title: importName.trim(), sourceUrl: urlInput.trim() })}
                className="h-12 w-full gap-1.5 rounded-xl font-bold"
              >
                {t("chrome.adminForm.url.useThis")}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                {isAdmin && scrapedImages.length > 1 && (
                  <Button type="button" variant="link" size="sm" className="h-9 px-1 text-xs" onClick={() => setShowImageSelector(true)}>
                    {t("chrome.adminForm.url.bulk")}
                  </Button>
                )}
                <Button type="button" variant="link" size="sm" className="h-9 px-1 text-xs text-muted-foreground" onClick={resetUrl}>
                  {t("chrome.adminForm.url.retryOther")}
                </Button>
              </div>
            </>
          )}

          {urlStatus === "failed" && (
            <>
              <PockeSays pose="sad" height={72}>
                <span className="block font-bold">{t("chrome.adminForm.url.failTitle")}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {failKind === "empty" ? t("chrome.adminForm.url.failNoImage") : t("chrome.adminForm.url.failFetch")}
                </span>
              </PockeSays>
              <Button type="button" onClick={() => onManual?.(urlInput.trim())} className="h-12 w-full gap-2 rounded-xl font-bold">
                <PenLine className="h-4 w-4" aria-hidden="true" />
                {t("chrome.adminForm.url.toManual")}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={pickPhoto} className="h-11 gap-1.5 rounded-xl text-xs">
                  <Images className="h-4 w-4" aria-hidden="true" />
                  {t("chrome.adminForm.url.toPhoto")}
                </Button>
                <Button type="button" variant="outline" onClick={resetUrl} className="h-11 gap-1.5 rounded-xl text-xs">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  {t("chrome.adminForm.url.retry")}
                </Button>
              </div>
              <WebHelpLink onClick={() => setMethod("web")} />
            </>
          )}

          {urlStatus === "limited" && (
            <>
              <PockeSays pose="wink" height={72}>
                <span className="block font-bold">
                  {limitedBy === "day" ? t("chrome.adminForm.url.limitedDayTitle") : t("chrome.adminForm.url.limitedHourTitle")}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t("chrome.adminForm.url.limitedBody")}</span>
              </PockeSays>
              <Button type="button" onClick={pickPhoto} className="h-12 w-full gap-2 rounded-xl font-bold">
                <Images className="h-4 w-4" aria-hidden="true" />
                {t("chrome.adminForm.url.toPhoto")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onManual?.(urlInput.trim())}
                className="h-11 w-full gap-1.5 rounded-xl text-sm"
              >
                <PenLine className="h-4 w-4" aria-hidden="true" />
                {t("chrome.adminForm.url.toManual")}
              </Button>
              <WebHelpLink onClick={() => setMethod("web")} />
            </>
          )}
        </div>
      )}

      <Dialog open={showImageSelector} onOpenChange={setShowImageSelector}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("addItem.selectGoods")}</DialogTitle>
            <DialogDescription>
              {t("addItem.maxImages")} ({t("addItem.selecting")}: {selectedImages.size}/10)
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[65vh]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
              {scrapedImages.map((imageData, index) => {
                const isSelected = selectedImages.has(imageData.url);
                return (
                  <div
                    key={index}
                    className="relative overflow-hidden rounded-lg border-2 cursor-pointer transition-all bg-background"
                    style={{
                      borderColor: isSelected ? "hsl(var(--primary))" : "hsl(var(--border))",
                      transform: isSelected ? "scale(0.98)" : "scale(1)",
                    }}
                    onClick={() => toggleImageSelection(imageData.url)}
                  >
                    <div className="aspect-square relative overflow-hidden">
                      <img src={imageData.url} alt={imageData.title || `Image ${index + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 right-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-background/80 text-muted-foreground border-2 border-border"
                          }`}
                        >
                          {isSelected && <Check className="w-5 h-5" strokeWidth={3} />}
                        </div>
                      </div>
                    </div>
                    {imageData.title && (
                      <div className="p-2">
                        <p className="text-xs font-medium line-clamp-2 text-foreground">{imageData.title}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowImageSelector(false);
                setSelectedImages(new Set());
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleConfirmSelection} disabled={selectedImages.size === 0}>
              {t("misc.itemForm.selectCount", { n: selectedImages.size })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * 追加のしかたのカード。左に「何が起きるか」の絵、右に名前と一言。
 * カード全体がボタン（片手でも押しやすいよう高さを取る）。
 */
function MethodCard({
  art,
  title,
  lead,
  tone,
  onClick,
}: {
  art: ReactNode;
  title: string;
  lead: string;
  tone: "primary" | "muted";
  onClick: () => void;
}) {
  const primary = tone === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-h-[5.5rem] w-full items-center gap-2.5 rounded-2xl border bg-card p-3 text-left transition-[border-color,background-color,transform] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        primary ? "border-primary/30 hover:border-primary/60" : "border-border hover:bg-muted/40"
      )}
    >
      <span
        className={cn(
          "flex h-[4.5rem] w-[6.75rem] shrink-0 items-center justify-center rounded-xl ring-1 ring-inset [&>svg]:h-[3.4rem] [&>svg]:w-[6.25rem]",
          primary ? "bg-primary/5 ring-primary/10" : "bg-muted/60 ring-foreground/5"
        )}
      >
        {art}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-bold leading-snug">{phrases(title)}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{phrases(lead)}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  );
}

/** うまくいくページ／苦手なページの見本（絵＋印＋一言） */
function PageExample({ kind, title, example }: { kind: "good" | "bad"; title: string; example: string }) {
  const good = kind === "good";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border p-2",
        good ? "border-success/30 bg-success-soft/40" : "border-border bg-muted/40"
      )}
    >
      <span className="relative">
        <PageExampleArt kind={kind} className={good ? undefined : "opacity-70"} />
        <span
          className={cn(
            "absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-background",
            good ? "bg-success text-success-foreground" : "bg-muted-foreground text-background"
          )}
        >
          {good ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" /> : <X className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
        </span>
      </span>
      <span className="min-w-0">
        <span className={cn("block text-2xs font-bold", good ? "text-success" : "text-muted-foreground")}>{title}</span>
        <span className="mt-0.5 block text-2xs leading-snug">{example}</span>
      </span>
    </div>
  );
}

/** 読み込めないページのための「画像を保存して追加する」案内（web）への小さなリンク */
function WebHelpLink({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex min-h-9 items-center gap-1 rounded-md px-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {t("chrome.adminForm.url.webHelp")}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/** 待っている間のポッケ（「ちょっと待ってね」） */
function PockeWaiting({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2" role="status" aria-live="polite">
      <Pocke pose="think" height={72} motion="bob" className="-mb-1" />
      <PockeBubble tail="left" className="mb-3 min-w-0 flex-1">
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden="true" />
          {text}
        </span>
      </PockeBubble>
    </div>
  );
}

/**
 * ガチャ・くじ・ランダムグッズは、キャラごとに1件ずつ登録してもらう案内。
 * 名前がそれらしいとき（strong）は目立たせる。
 */
export function GachaHint({ strong = false, className }: { strong?: boolean; className?: string }) {
  const { t } = useLanguage();
  return (
    <div
      data-gacha-hint={strong ? "strong" : "soft"}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border p-2.5",
        strong ? "border-points/40 bg-points/10" : "border-border bg-muted/30",
        className
      )}
    >
      <GachaSplitArt />
      <span className="min-w-0">
        <span className="block text-xs font-bold">{t("chrome.adminForm.gacha.title")}</span>
        <span className="mt-0.5 block text-2xs leading-snug text-muted-foreground">{t("chrome.adminForm.gacha.body")}</span>
      </span>
    </div>
  );
}

/** 画像のアドレスを直接入れる欄（たたんでおく） */
function ImageUrlField({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  const { t } = useLanguage();
  return (
    <details className="group rounded-xl px-1 text-xs text-muted-foreground">
      <summary className="flex min-h-9 cursor-pointer list-none items-center justify-center gap-1 [&::-webkit-details-marker]:hidden">
        <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
        {t("chrome.adminForm.method.imageUrlToggle")}
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
      </summary>
      <div className="mt-2 flex gap-2">
        <Input
          id="imageUrl"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="https://..."
          className="h-10 text-sm"
        />
        <Button type="button" variant="outline" onClick={onSubmit} className="h-10 shrink-0 px-4 text-sm">
          {t("addItem.set")}
        </Button>
      </div>
    </details>
  );
}
