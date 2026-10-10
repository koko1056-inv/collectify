import { useState, useEffect, useRef, useMemo } from "react";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";
import { toRenderUrl, toProxyUrl, getCatalogThumbUrl } from "@/utils/optimized-image";

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
/**
 * sizes の既定値。一覧のマスは スマホ 2列（約50vw）・タブレット 3列・PC で 200〜300px 程度。
 * 以前は PC で "800px" としていたため、1倍密度の画面でも 800px 版を取っていた。
 */
const DEFAULT_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px";

/**
 * 読み込みの段階。失敗するたびに次へ進む。
 *  0: 一番軽いもの（Storage は画像変換、外部のカタログ画像はサーバー側で作ったサムネ）
 *  1: 外部画像は proxy-image 経由（サムネがまだ無い・作れなかった画像）
 *  2: 代わりの画像（fallbackSrc）
 */
type Stage = 0 | 1 | 2;

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
  const [stage, setStage] = useState<Stage>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // srcが変わったらリセット
  useEffect(() => {
    setIsLoaded(false);
    setStage(0);
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
    if (!src || stage === 2) {
      return { displaySrc: fallbackSrc, srcSet: undefined, sizesAttr: undefined };
    }

    // 1) Supabase Storage → render エンドポイントで縮小・圧縮 + srcset
    if (src.includes("/storage/v1/object/")) {
      if (stage === 1) {
        // 画像変換が使えなかったときは元の画像
        return { displaySrc: src, srcSet: undefined, sizesAttr: sizes };
      }
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
        sizesAttr: sizes || DEFAULT_SIZES,
      };
    }

    // 2) 外部のカタログ画像 → まずサーバー側で作ったサムネ（Storage の CDN から 10〜40KB）
    if (stage === 0) {
      const thumb = getCatalogThumbUrl(src);
      if (thumb) return { displaySrc: thumb, srcSet: undefined, sizesAttr: sizes };
    }

    // 3) data: / 既にプロキシ済み / 同一オリジン
    const isExternal =
      src.startsWith("http") &&
      !src.startsWith("data:") &&
      !src.includes("/functions/v1/proxy-image");

    return {
      displaySrc: isExternal ? toProxyUrl(src) : src,
      srcSet: undefined,
      sizesAttr: sizes,
    };
  }, [src, stage, widths, quality, sizes, fallbackSrc]);

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
            if (stage < 2) {
              setStage((s) => (s < 2 ? ((s + 1) as Stage) : s));
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
