import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"
import { getAvatarImageUrl } from "@/utils/optimized-image"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

interface AvatarImageProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {
  fallbackDelay?: number;
  /**
   * Storage の画像を画像変換で縮めるときの幅（px）。表示の大きさ × 3（高密度の画面）くらいにする。
   * 既定の 192 は 64px（h-16）までのアイコン向け。大きく出すところ（プロフィールの顔など）は大きくする。
   */
  renderWidth?: number;
}

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, src, fallbackDelay = 600, renderWidth = 192, ...props }, ref) => {
  const [imgSrc, setImgSrc] = React.useState<string | undefined>(undefined);
  const [retryCount, setRetryCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const maxRetries = 3;

  // 元画像は 1024px・1MB 超の PNG が多い。ヘッダーの 28px のアイコンにもそれを読んでいたので、縮めたものを読む
  const optimizedSrc = React.useMemo(() => getAvatarImageUrl(src, renderWidth), [src, renderWidth]);

  // srcが変更されたらリセット
  React.useEffect(() => {
    if (!src || !optimizedSrc) {
      setImgSrc(undefined);
      setIsLoading(false);
      return;
    }

    setRetryCount(0);
    setIsLoading(true);

    // 画像をプリロードしてから表示（縮めた画像が読めなければ、元の画像で一度だけやり直す）
    let img = new Image();
    const tryLoad = (url: string, onFail: () => void) => {
      img = new Image();
      img.onload = () => {
        setImgSrc(url);
        setIsLoading(false);
      };
      img.onerror = onFail;
      img.src = url;
    };
    tryLoad(optimizedSrc, () => {
      if (optimizedSrc !== src) {
        tryLoad(src, () => setRetryCount(1));
      } else {
        // 初回エラー時、リトライを開始
        setRetryCount(1);
      }
    });

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, optimizedSrc]);

  // リトライロジック（元のURLで。縮めた画像は上で一度試している）
  React.useEffect(() => {
    if (retryCount === 0 || retryCount > maxRetries || !src) return;
    
    const delay = 500 * retryCount;
    const timer = setTimeout(() => {
      const img = new Image();
      const separator = src.includes("?") ? "&" : "?";
      const retrySrc = `${src}${separator}_r=${retryCount}&t=${Date.now()}`;
      
      img.onload = () => {
        setImgSrc(retrySrc);
        setIsLoading(false);
      };
      img.onerror = () => {
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
        } else {
          // 最大リトライ回数に達したらフォールバック
          setImgSrc(undefined);
          setIsLoading(false);
        }
      };
      img.src = retrySrc;
    }, delay);
    
    return () => clearTimeout(timer);
  }, [retryCount, src]);

  if (!imgSrc && !isLoading) {
    // 画像がない場合はnullを返してFallbackを表示させる
    return null;
  }

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={imgSrc}
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  );
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
