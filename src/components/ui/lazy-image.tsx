import { useState, useEffect, useRef, useMemo } from "react";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";
import { SUPABASE_URL } from "@/integrations/supabase/client";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  fallbackSrc?: string;
  /** 出力候補の幅（srcset 用）。デフォルトはサムネ向け。 */
  widths?: number[];
  /** <img sizes> 属性。レイアウト幅のヒント。 */
  sizes?: string;
  /** 画質（1-100、デフォルト 70）。 */
  quality?: number;
  /** 画面外プリロード距離 (px)。 */
  rootMargin?: string;
}

const DEFAULT_WIDTHS = [200, 400, 800];

/** Supabase Storage の public/sign URL を画像変換エンドポイントに書き換える */
function toRenderUrl(src: string, width: number, quality: number): string | null {
  if (!src.includes("/storage/v1/object/")) return null;
  // /storage/v1/object/(public|sign)/... → /storage/v1/render/image/(public|sign)/...
  const rendered = src.replace("/storage/v1/object/", "/storage/v1/render/image/");
  const sep = rendered.includes("?") ? "&" : "?";
  return `${rendered}${sep}width=${width}&quality=${quality}&resize=contain`;
}

/** 外部URL → SupabaseのEdgeプロキシ経由に変換 */
function toProxyUrl(src: string): string {
  return `${SUPABASE_URL}/functions/v1/proxy-image?url=${encodeURIComponent(src)}`;
}

export function LazyImage({
  src,
  alt,
  className,
  skeletonClassName,
  fallbackSrc = "/placeholder.svg",
  widths = DEFAULT_WIDTHS,
  sizes,
  quality = 70,
  rootMargin = "300px",
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // srcが変わったらリセット
  useEffect(() => {
    setIsLoaded(false);
    setFailed(false);
  }, [src]);

  // IntersectionObserver で画面に近づいた時だけ読み込み
  useEffect(() => {
    if (!containerRef.current) return;
    // 画面内ならネイティブの loading=lazy に任せる手もあるが、CLS と decode を優先
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [rootMargin]);

  const { displaySrc, srcSet, sizesAttr } = useMemo(() => {
    if (!src || failed) {
      return { displaySrc: fallbackSrc, srcSet: undefined, sizesAttr: undefined };
    }

    // 1) Supabase Storage → render エンドポイントで縮小・圧縮 + srcset
    if (src.includes("/storage/v1/object/")) {
      const set = widths
        .map((w) => {
          const u = toRenderUrl(src, w, quality);
          return u ? `${u} ${w}w` : null;
        })
        .filter(Boolean)
        .join(", ");
      const fallback = toRenderUrl(src, widths[widths.length - 1], quality) || src;
      return {
        displaySrc: fallback,
        srcSet: set || undefined,
        sizesAttr: sizes || `(max-width: 640px) 50vw, ${widths[widths.length - 1]}px`,
      };
    }

    // 2) data: / 既にプロキシ済み / 同一オリジン
    const isExternal =
      src.startsWith("http") &&
      !src.startsWith("data:") &&
      !src.includes("/functions/v1/proxy-image");

    return {
      displaySrc: isExternal ? toProxyUrl(src) : src,
      srcSet: undefined,
      sizesAttr: sizes,
    };
  }, [src, failed, widths, quality, sizes, fallbackSrc]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {!isLoaded && (
        <Skeleton className={cn("absolute inset-0 w-full h-full", skeletonClassName)} />
      )}
      {isInView && (
        <img
          src={displaySrc}
          srcSet={srcSet}
          sizes={sizesAttr}
          alt={alt}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            if (!failed) {
              setFailed(true);
              setIsLoaded(false);
            } else {
              setIsLoaded(true);
            }
          }}
          {...props}
        />
      )}
    </div>
  );
}
