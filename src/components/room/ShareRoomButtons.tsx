import { Button } from "@/components/ui/button";
import { Twitter, Instagram } from "lucide-react";
import { toast } from "sonner";

interface ShareRoomButtonsProps {
  username?: string | null;
  displayName?: string | null;
}

/**
 * /my-room ページ上部のシェアボタン群
 * - X: Web Intent でテキスト + URL をプリセット
 * - Instagram: 直接シェアAPIが無いため、URLをコピーして Instagram を開く
 */
export function ShareRoomButtons({ username, displayName }: ShareRoomButtonsProps) {
  const shareUrl =
    typeof window !== "undefined"
      ? username
        ? `${window.location.origin}/u/${username}`
        : window.location.href
      : "";

  const shareText = `${displayName || username || "私"}のコレクションルームを見てね！ #Collectify`;

  const handleShareX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareInstagram = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success("リンクをコピーしました", {
        description: "Instagramのストーリーや投稿に貼り付けてください",
      });
    } catch {
      toast.error("コピーに失敗しました");
    }
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleShareX}
        className="gap-1.5 rounded-full"
        aria-label="Xでシェア"
      >
        <Twitter className="w-4 h-4" />
        <span className="text-xs font-medium">X</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleShareInstagram}
        className="gap-1.5 rounded-full"
        aria-label="Instagramでシェア"
      >
        <Instagram className="w-4 h-4" />
        <span className="text-xs font-medium">Instagram</span>
      </Button>
    </div>
  );
}
