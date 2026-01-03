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
  const [imgSrc, setImgSrc] = React.useState(src);
  const [retryCount, setRetryCount] = React.useState(0);
  const maxRetries = 2;

  // srcが変更されたらリセット
  React.useEffect(() => {
    setImgSrc(src);
    setRetryCount(0);
  }, [src]);

  const handleError = React.useCallback(() => {
    if (retryCount < maxRetries && src) {
      // 再試行時にキャッシュバスティング
      setTimeout(() => {
        const separator = src.includes("?") ? "&" : "?";
        setImgSrc(`${src}${separator}_retry=${retryCount + 1}&t=${Date.now()}`);
        setRetryCount(prev => prev + 1);
      }, 300 * (retryCount + 1));
    }
  }, [src, retryCount]);

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={imgSrc}
      className={cn("aspect-square h-full w-full", className)}
      onError={handleError}
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
