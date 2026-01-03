import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

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
}

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, src, fallbackDelay = 600, ...props }, ref) => {
  const [imgSrc, setImgSrc] = React.useState<string | undefined>(undefined);
  const [retryCount, setRetryCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const maxRetries = 3;

  // srcが変更されたらリセット
  React.useEffect(() => {
    if (!src) {
      setImgSrc(undefined);
      setIsLoading(false);
      return;
    }
    
    setRetryCount(0);
    setIsLoading(true);
    
    // 画像をプリロードしてから表示
    const img = new Image();
    img.onload = () => {
      setImgSrc(src);
      setIsLoading(false);
    };
    img.onerror = () => {
      // 初回エラー時、リトライを開始
      setRetryCount(1);
    };
    img.src = src;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  // リトライロジック
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
