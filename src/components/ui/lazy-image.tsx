import { useState, useEffect, useRef, useCallback } from "react";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  fallbackSrc?: string;
}

export function LazyImage({ 
  src, 
  alt, 
  className, 
  skeletonClassName,
  fallbackSrc = "/placeholder.svg",
  ...props 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const maxRetries = 2;

  // srcが変更されたらリセット
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setRetryCount(0);
  }, [src]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "100px",
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    if (retryCount < maxRetries) {
      // 少し待ってから再試行
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setIsLoaded(false);
      }, 500 * (retryCount + 1));
    } else {
      setHasError(true);
      setIsLoaded(true); // フォールバックを表示するため
    }
  }, [retryCount]);

  // 再試行時にキャッシュをバイパスするためのURL生成
  const getImageSrc = () => {
    if (!isInView) return undefined;
    if (hasError) return fallbackSrc;
    
    // 再試行時はキャッシュバスティング用のパラメータを追加
    if (retryCount > 0 && src && !src.includes("placeholder")) {
      const separator = src.includes("?") ? "&" : "?";
      return `${src}${separator}_retry=${retryCount}`;
    }
    return src;
  };

  return (
    <div className="relative w-full h-full">
      {!isLoaded && (
        <Skeleton className={cn("absolute inset-0 w-full h-full", skeletonClassName)} />
      )}
      <img
        ref={imgRef}
        src={getImageSrc()}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        {...props}
      />
    </div>
  );
}
