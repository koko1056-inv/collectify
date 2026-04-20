import { useState, useEffect, useRef, useCallback } from "react";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";
import { SUPABASE_URL } from "@/integrations/supabase/client";

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
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const maxRetries = 3;

  // srcが変更されたらリセット
  useEffect(() => {
    setIsLoaded(false);
    setCurrentSrc(null);
    setRetryCount(0);
  }, [src]);

  // IntersectionObserver for lazy loading
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

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // 画像のプリロードと表示
  useEffect(() => {
    if (!isInView || !src) return;
    
    const loadImage = (imageSrc: string) => {
      const img = new Image();
      
      img.onload = () => {
        setCurrentSrc(imageSrc);
        setIsLoaded(true);
      };
      
      img.onerror = () => {
        if (retryCount < maxRetries) {
          // リトライ回数を増やして再試行
          const timer = setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 500 * (retryCount + 1));
          return () => clearTimeout(timer);
        } else {
          // フォールバック画像を表示
          setCurrentSrc(fallbackSrc);
          setIsLoaded(true);
        }
      };
      
      img.src = imageSrc;
    };

    // 外部ホストの画像はCORS/期限切れで壊れやすいのでプロキシ経由で読み込む
    const shouldProxy =
      src.startsWith("http") &&
      !src.startsWith("data:") &&
      !src.includes("supabase.co/storage") &&
      !src.includes("/functions/v1/proxy-image");

    const baseSrc = shouldProxy
      ? `${SUPABASE_URL}/functions/v1/proxy-image?url=${encodeURIComponent(src)}`
      : src;

    // リトライ時はキャッシュバスティングパラメータを追加
    let imageSrc = baseSrc;
    if (retryCount > 0 && !baseSrc.includes("placeholder")) {
      const separator = baseSrc.includes("?") ? "&" : "?";
      imageSrc = `${baseSrc}${separator}_r=${retryCount}&t=${Date.now()}`;
    }
    
    loadImage(imageSrc);
  }, [isInView, src, retryCount, fallbackSrc]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {!isLoaded && (
        <Skeleton className={cn("absolute inset-0 w-full h-full", skeletonClassName)} />
      )}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          loading="lazy"
          {...props}
        />
      )}
    </div>
  );
}
