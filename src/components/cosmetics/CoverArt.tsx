import { cn } from "@/lib/utils";
import { getCoverLook, type CoverKey, type OshiColor } from "@/lib/cosmetics";

/**
 * 着せ替えのカバー柄。親（relative・overflow-hidden）いっぱいに敷く。
 * プロフィールのカバー、着せ替えシートの見本、ショップの小さな見本で同じものを使う。
 */
export function CoverArt({
  coverKey,
  oshiColor,
  className,
}: {
  coverKey: CoverKey;
  oshiColor?: OshiColor;
  className?: string;
}) {
  const look = getCoverLook(coverKey, oshiColor);
  return (
    <div aria-hidden="true" className={cn("absolute inset-0", className)}>
      <div className={cn("absolute inset-0", look.shimmer && "cosmetic-shimmer")} style={look.base} />
      {look.layers.map((style, i) => (
        <div
          key={i}
          className={cn("absolute inset-0", look.shimmer && i === 0 && "cosmetic-shimmer")}
          style={style}
        />
      ))}
    </div>
  );
}
