import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export function useRoomScreenshot() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { t } = useLanguage();

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
      toast.error(t("notices.screenshot.captureFailed"));
      return null;
    }

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            toast.error(t("notices.screenshot.renderFailed"));
            resolve(null);
          }
        },
        "image/png",
        1.0
      );
    });
  }, [getCanvas, t]);

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
    toast.success(t("notices.screenshot.saved"));
  }, [takeScreenshot, t]);

  // Share via Web Share API (mobile) or copy to clipboard (desktop)
  const shareScreenshot = useCallback(async (roomTitle?: string) => {
    const blob = await takeScreenshot();
    if (!blob) return;

    const file = new File([blob], "collectify-room.png", { type: "image/png" });
    const shareData = {
      title: roomTitle || t("notices.screenshot.shareTitle"),
      text: t("notices.screenshot.shareText"),
      files: [file],
    };

    // Try native share (mobile)
    if (navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success(t("notices.screenshot.shared"));
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
      toast.success(t("notices.screenshot.copiedToClipboard"));
    } catch {
      // Last resort: download
      await downloadScreenshot();
    }
  }, [takeScreenshot, downloadScreenshot, t]);

  return { takeScreenshot, downloadScreenshot, shareScreenshot };
}
