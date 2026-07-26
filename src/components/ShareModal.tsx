
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Facebook, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InviteCodeSection } from "@/components/invite/InviteCodeSection";
import { useLanguage } from "@/contexts/LanguageContext";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  image: string;
  showInviteCode?: boolean;
}

export function ShareModal({ isOpen, onClose, title, url, image, showInviteCode = false }: ShareModalProps) {
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleShare = async (platform: string) => {
    const shareUrl = encodeURIComponent(url);
    const shareTitle = encodeURIComponent(title);

    let shareLink = '';
    switch (platform) {
      case 'x':
        shareLink = `https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`;
        break;
      case 'instagram':
        // InstagramはWeb Share APIを使用
        if (navigator.share) {
          try {
            await navigator.share({
              title: title,
              url: url,
            });
            onClose();
            return;
          } catch (error) {
            console.error('Error sharing:', error);
          }
        }
        // フォールバック: URLをコピー
        await navigator.clipboard.writeText(url);
        toast({
          title: t("chrome.share.urlCopiedTitle"),
          description: t("chrome.share.urlCopiedDesc"),
        });
        onClose();
        return;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
        break;
      case 'line':
        shareLink = `https://social-plugins.line.me/lineit/share?url=${shareUrl}`;
        break;
      case 'tiktok':
        // TikTokはブラウザ共有APIを使用
        if (navigator.share) {
          try {
            await navigator.share({
              title: title,
              text: t("chrome.share.tiktokText"),
              url: url,
            });
            onClose();
            return;
          } catch (error) {
            console.error('Error sharing:', error);
          }
        }
        // フォールバック: TikTokアプリを開く
        shareLink = `https://www.tiktok.com/share?url=${shareUrl}`;
        break;
      default:
        if (navigator.share) {
          try {
            await navigator.share({
              title: title,
              url: url,
            });
            onClose();
            return;
          } catch (error) {
            console.error('Error sharing:', error);
          }
        }
        toast({
          title: t("chrome.share.title"),
          description: t("chrome.share.unsupported"),
        });
        return;
    }

    window.open(shareLink, '_blank', 'noopener,noreferrer');
    toast({
      title: t("chrome.share.doneTitle"),
      description: t("chrome.share.doneDesc", { platform }),
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("chrome.share.title")}</DialogTitle>
        </DialogHeader>
        {showInviteCode && (
          <div className="border-b border-border pb-4 mb-2">
            <InviteCodeSection />
          </div>
        )}
        <div className="flex flex-col gap-4 py-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => handleShare('x')}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            {t("chrome.share.on", { platform: "X" })}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => handleShare('instagram')}
          >
            <Instagram className="h-5 w-5 text-pink-600" />
            {t("chrome.share.on", { platform: "Instagram" })}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => handleShare('facebook')}
          >
            <Facebook className="h-5 w-5 text-blue-600" />
            {t("chrome.share.on", { platform: "Facebook" })}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => handleShare('tiktok')}
          >
            <img src="/tiktok-icon.svg" alt="TikTok" className="h-5 w-5" />
            {t("chrome.share.on", { platform: "TikTok" })}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => handleShare('line')}
          >
            <img src="/line-icon.svg" alt="LINE" className="h-5 w-5" />
            {t("chrome.share.on", { platform: "LINE" })}
          </Button>
          {navigator.share && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleShare('native')}
            >
              <Share2 className="h-5 w-5" />
              {t("chrome.share.other")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
