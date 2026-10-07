import { useEffect, useRef, useState } from "react";
import { Download, Link2, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useShareInvite } from "@/hooks/useShareInvite";
import { renderShareCard, type ShareCardInput } from "@/utils/shareCard";

export type ShareCardSpec = Omit<ShareCardInput, "footerUrl" | "tagline"> & {
  /** SNSに添える本文（URLは自動で末尾に付く） */
  shareText: string;
};

interface ShareCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spec: ShareCardSpec | null;
  fileName?: string;
}

export function ShareCardDialog({ open, onOpenChange, spec, fileName = "collectify-card.png" }: ShareCardDialogProps) {
  const { t } = useLanguage();
  const { getInviteUrl } = useShareInvite();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // 開き直しや spec の更新で古い描画結果が上書きされないよう、世代で管理する
  const generation = useRef(0);

  useEffect(() => {
    if (!open || !spec) return;
    const mine = ++generation.current;
    setLoading(true);
    setFailed(false);
    setBlob(null);
    (async () => {
      try {
        const url = await getInviteUrl();
        const card = await renderShareCard({
          ...spec,
          tagline: t("engage.share.tagline"),
          footerUrl: url,
        });
        if (generation.current !== mine) return;
        setShareUrl(url);
        setBlob(card);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(card);
        });
      } catch {
        if (generation.current === mine) setFailed(true);
      } finally {
        if (generation.current === mine) setLoading(false);
      }
    })();
    // spec はオブジェクトなので、開いた時点の内容だけで描く
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, spec]);

  useEffect(
    () => () => {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    },
    []
  );

  const text = spec ? `${spec.shareText}\n${shareUrl}` : "";

  const handleShare = async () => {
    if (!blob || !spec) return;
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    if (navigator.share) {
      try {
        await navigator.share({ text: spec.shareText, url: shareUrl });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    // 共有シートが使えない環境（PCなど）: X の投稿画面を開く。画像は「保存」から添えてもらう。
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(spec.shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank", "noopener");
    toast.info(t("engage.share.attachHint"));
  };

  const handleDownload = () => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast.success(t("engage.share.saved"));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("engage.share.copied"));
    } catch {
      toast.error(t("engage.share.copyFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("engage.share.title")}</DialogTitle>
          <DialogDescription>{t("engage.share.desc")}</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[1080/1350] w-full overflow-hidden rounded-xl border border-border bg-muted">
          {previewUrl && !loading && (
            <img src={previewUrl} alt={t("engage.share.previewAlt")} className="h-full w-full object-contain" />
          )}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {failed && (
            <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
              {t("engage.share.failed")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <Button onClick={handleShare} disabled={!blob} className="gap-1.5">
            <Share2 className="h-4 w-4" />
            {t("engage.share.share")}
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload} disabled={!blob} aria-label={t("engage.share.save")}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleCopy} disabled={!blob} aria-label={t("engage.share.copy")}>
            <Link2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center">{t("engage.share.inviteNote")}</p>
      </DialogContent>
    </Dialog>
  );
}
