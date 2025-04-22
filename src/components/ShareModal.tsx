
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Facebook, Twitter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  image: string;
}

export function ShareModal({ isOpen, onClose, title, url, image }: ShareModalProps) {
  const { toast } = useToast();

  const handleShare = async (platform: string) => {
    const shareUrl = encodeURIComponent(url);
    const shareTitle = encodeURIComponent(title);
    const shareImage = encodeURIComponent(image);

    let shareLink = '';
    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`;
        break;
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
              text: "TikTokで共有",
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
          title: "共有",
          description: "このプラットフォームでの共有は現在サポートされていません。",
        });
        return;
    }

    window.open(shareLink, '_blank', 'noopener,noreferrer');
    toast({
      title: "共有完了",
      description: `${platform}で共有しました。`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>共有</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => handleShare('twitter')}
          >
            <Twitter className="h-5 w-5 text-blue-400" />
            Twitter で共有
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => handleShare('facebook')}
          >
            <Facebook className="h-5 w-5 text-blue-600" />
            Facebook で共有
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => handleShare('tiktok')}
          >
            <img src="/tiktok-icon.svg" alt="TikTok" className="h-5 w-5" />
            TikTok で共有
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => handleShare('line')}
          >
            <img src="/line-icon.svg" alt="LINE" className="h-5 w-5" />
            LINE で共有
          </Button>
          {navigator.share && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleShare('native')}
            >
              <Share2 className="h-5 w-5" />
              その他の方法で共有
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
