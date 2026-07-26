import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface ShareItemParams {
  title: string;
  imageUrl?: string | null;
  /** 任意: シェア文に添えるコンテンツ名など */
  contentName?: string | null;
}

/**
 * グッズ単体をシェアするフック。
 * 1. 画像を取得できれば「画像 + テキスト」をネイティブ共有 (Web Share API level 2)
 * 2. ダメなら「テキスト」のみネイティブ共有
 * 3. それも不可ならテキストをクリップボードにコピー
 *
 * Capacitor(iOS) / モバイルブラウザでのネイティブ共有シートを主対象にしている。
 */
export function useItemShare() {
  const [isSharing, setIsSharing] = useState(false);
  const { t } = useLanguage();

  const shareItem = useCallback(async ({ title, imageUrl, contentName }: ShareItemParams) => {
    const text = contentName
      ? t("notices.share.itemTextWithContent", { title, contentName })
      : t("notices.share.itemText", { title });

    setIsSharing(true);
    try {
      // 1. 画像ファイル付きのネイティブ共有を試す
      if (imageUrl && typeof navigator !== "undefined" && navigator.canShare) {
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          const ext = blob.type.split("/")[1] || "png";
          const file = new File([blob], `collectify-item.${ext}`, { type: blob.type });
          const data = { title, text, files: [file] } as ShareData;
          if (navigator.canShare(data)) {
            await navigator.share(data);
            return;
          }
        } catch (e) {
          // 画像取得/共有に失敗 → テキスト共有へフォールバック
          if ((e as Error)?.name === "AbortError") return; // ユーザーキャンセル
        }
      }

      // 2. テキストのみネイティブ共有
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title, text });
          return;
        } catch (e) {
          if ((e as Error)?.name === "AbortError") return;
        }
      }

      // 3. クリップボードにコピー
      await navigator.clipboard.writeText(text);
      toast.success(t("notices.share.textCopied"));
    } catch (e) {
      console.error("Item share failed:", e);
      toast.error(t("notices.share.failed"));
    } finally {
      setIsSharing(false);
    }
  }, [t]);

  return { shareItem, isSharing };
}
