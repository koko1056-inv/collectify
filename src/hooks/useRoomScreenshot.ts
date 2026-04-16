import { useCallback, useRef } from "react";
import { toast } from "sonner";

export function useRoomScreenshot() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Find the three.js canvas element
  const getCanvas = useCallback((): HTMLCanvasElement | null => {
    if (canvasRef.current) return canvasRef.current;
    const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
    if (canvas) canvasRef.current = canvas;
    return canvas;
  }, []);

  // Take a screenshot of the current 3D view
  const takeScreenshot = useCallback(async (): Promise<Blob | null> => {
    const canvas = getCanvas();
    if (!canvas) {
      toast.error("スクリーンショットの取得に失敗しました");
      return null;
    }

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            toast.error("画像の生成に失敗しました");
            resolve(null);
          }
        },
        "image/png",
        1.0
      );
    });
  }, [getCanvas]);

  // Download screenshot
  const downloadScreenshot = useCallback(async () => {
    const blob = await takeScreenshot();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collectify-room-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("スクリーンショットを保存しました！");
  }, [takeScreenshot]);

  // Share via Web Share API (mobile) or copy to clipboard (desktop)
  const shareScreenshot = useCallback(async (roomTitle?: string) => {
    const blob = await takeScreenshot();
    if (!blob) return;

    const file = new File([blob], "collectify-room.png", { type: "image/png" });
    const shareData = {
      title: roomTitle || "マイルーム - Collectify",
      text: "自分だけの推し部屋を作ったよ！ #Collectify",
      files: [file],
    };

    // Try native share (mobile)
    if (navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success("シェアしました！");
        return;
      } catch (e) {
        // User cancelled or share failed — fall through to clipboard
        if ((e as Error).name === "AbortError") return;
      }
    }

    // Fallback: copy image to clipboard
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      toast.success("画像をクリップボードにコピーしました！SNSに貼り付けできます");
    } catch {
      // Last resort: download
      await downloadScreenshot();
    }
  }, [takeScreenshot, downloadScreenshot]);

  return { takeScreenshot, downloadScreenshot, shareScreenshot };
}
