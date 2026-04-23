import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Save, Share2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  generatedImage: string;
  galleryTitle: string;
  galleryDescription: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  onReset: () => void;
  onShareTwitter: () => void;
  isSaving: boolean;
}

export function GeneratedResultView({
  generatedImage,
  galleryTitle,
  galleryDescription,
  onTitleChange,
  onDescriptionChange,
  onSave,
  onReset,
  onShareTwitter,
  isSaving,
}: Props) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `goods-display-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("画像をダウンロードしました");
  };

  const handleShareToFacebook = () => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      window.location.href
    )}`;
    window.open(shareUrl, "_blank", "width=600,height=400");
    toast.success("Facebookシェア画面を開きました");
  };

  const handleShareNative = async () => {
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const file = new File([blob], "display.png", { type: "image/png" });

      if (navigator.share) {
        await navigator.share({
          title: galleryTitle || "グッズ展示場",
          text: galleryDescription || "グッズ展示場を作成しました！",
          files: [file],
        });
        toast.success("シェアしました");
      } else {
        toast.error("このブラウザではシェア機能がサポートされていません");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Error sharing:", error);
        toast.error("シェアに失敗しました");
      }
    }
  };

  return (
    <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" as any }}>
      <div className="space-y-4 pb-4 pr-4">
        <div className="relative rounded-lg overflow-hidden border">
          <img src={generatedImage} alt="Generated display" className="w-full h-auto" />
        </div>

        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
          <h3 className="font-semibold">ギャラリーに保存</h3>
          <div className="space-y-2">
            <Label htmlFor="gallery-title">タイトル</Label>
            <Input
              id="gallery-title"
              value={galleryTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="展示のタイトルを入力"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gallery-description">説明（任意）</Label>
            <Textarea
              id="gallery-description"
              value={galleryDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="展示の説明を入力"
              rows={3}
            />
          </div>
          <Button onClick={onSave} disabled={isSaving || !galleryTitle.trim()} className="w-full">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                ギャラリーを保存
              </>
            )}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleDownload} variant="outline" className="flex-1">
            ダウンロード
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                シェア
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onShareTwitter}>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                X (Twitter)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShareToFacebook}>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShareNative}>
                <Share2 className="w-4 h-4 mr-2" />
                その他
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={onReset} variant="outline" className="flex-1">
            最初から作り直す
          </Button>
        </div>
      </div>
    </div>
  );
}
