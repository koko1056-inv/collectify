import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getFrameLook, type FrameKey, type OshiColor } from "@/lib/cosmetics";

/**
 * アイコンの縁（着せ替え）。中のアバターを少し内側に置き、外側に輪を描く。
 * 輪は別の層にして回すので、ホログラムが回ってもアバターは動かない。
 * frameKey が無いときは何も足さずにそのまま返す。
 */
export function AvatarFrame({
  frameKey,
  oshiColor,
  children,
  thickness = 4,
  className,
}: {
  frameKey: FrameKey | null | undefined;
  oshiColor?: OshiColor;
  children: ReactNode;
  /** 輪の太さ（px） */
  thickness?: number;
  className?: string;
}) {
  if (!frameKey) return <>{children}</>;
  const look = getFrameLook(frameKey, oshiColor);
  return (
    <span className={cn("relative inline-block rounded-full", className)} style={{ padding: thickness }}>
      <span
        aria-hidden="true"
        className={cn("absolute inset-0 rounded-full", look.spin && "cosmetic-spin")}
        style={look.ring}
      />
      <span className="relative block rounded-full">{children}</span>
    </span>
  );
}
