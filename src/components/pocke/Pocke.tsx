import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { POCKE_ASPECT, pockeSrc, type PockePose } from "./pockeAssets";

export type { PockePose } from "./pockeAssets";

/**
 * ポッケ: Collectify のガイド役のカンガルー。お腹の袋（ポッケ）に推しグッズをしまっておく子。
 * 最初のあいさつ・画面の案内・おすすめ・お祝いで、場面に合った表情で出てくる。
 *
 * Duolingo のフクロウにならった決まりごと:
 *  - 話すときは「ポッケが左・吹き出しが右」（PockeSays）。画面の案内も、ポッケが話す言葉として書く
 *  - 一人称は「ぼく」。短く、語りかける口調（〜だよ・〜してね）。相手を責めない
 *  - 操作にはその場で表情で返す（選んだら喜ぶ・できたらウインク）。お祝いは大きく、ふだんの案内は小さく
 */
interface PockeProps {
  pose: PockePose;
  /** 高さ（px）。幅は絵の比率で決まる */
  height: number;
  /** "bob" = その場で弾み続ける / "pop" = 跳ねて現れる。動きを減らす設定の人には動かさない */
  motion?: "bob" | "pop" | "pop-bob";
  className?: string;
  /** 読み上げ用。セリフが隣に書いてあるときは空（飾り）でよい */
  alt?: string;
  /** 一覧のように画面の下の方に出すときは lazy */
  loading?: "eager" | "lazy";
}

export function Pocke({ pose, height, motion, className, alt = "", loading = "eager" }: PockeProps) {
  const img = (
    <img
      src={pockeSrc(pose)}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      width={Math.round(height * POCKE_ASPECT[pose])}
      height={height}
      loading={loading}
      decoding="async"
      draggable={false}
      className={cn(
        "pointer-events-none select-none object-contain",
        (motion === "bob" || motion === "pop-bob") && "motion-safe:animate-pocke-bob",
        className
      )}
      style={{ height, width: "auto" }}
    />
  );
  // 跳ねて現れる動きは外側に付ける（弾む動きと transform が重ならないように）
  if (motion === "pop" || motion === "pop-bob") {
    return <span className="inline-block shrink-0 motion-safe:animate-pocke-pop">{img}</span>;
  }
  return img;
}

/**
 * ポッケのセリフ（吹き出し）。tail は吹き出しのしっぽの向き（ポッケのいる側）。
 */
export function PockeBubble({
  children,
  tail = "bottom",
  className,
}: {
  children: ReactNode;
  tail?: "bottom" | "left" | "top";
  className?: string;
}) {
  return (
    <div className={cn("relative rounded-2xl border bg-card px-3.5 py-2.5 text-sm leading-relaxed text-card-foreground shadow-sm", className)}>
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "absolute h-3 w-3 rotate-45 border bg-card",
          tail === "bottom" && "-bottom-[7px] left-1/2 -ml-1.5 border-l-0 border-t-0",
          tail === "top" && "-top-[7px] left-1/2 -ml-1.5 border-b-0 border-r-0",
          tail === "left" && "-left-[7px] top-1/2 -mt-1.5 border-r-0 border-t-0"
        )}
      />
    </div>
  );
}

/**
 * ポッケが話す（ポッケが左・吹き出しが右）。Duolingo の「キャラが問いかける」形。
 * reactKey を変えると、ポッケが跳ねて出直す（操作への反応に使う）。
 */
export function PockeSays({
  pose,
  height = 96,
  reactKey,
  children,
  className,
  bubbleClassName,
}: {
  pose: PockePose;
  height?: number;
  reactKey?: string | number;
  children: ReactNode;
  className?: string;
  bubbleClassName?: string;
}) {
  return (
    <div className={cn("flex items-end gap-2", className)}>
      <Pocke key={reactKey ?? pose} pose={pose} height={height} motion="pop" className="-mb-1" />
      <PockeBubble tail="left" className={cn("mb-3 min-w-0 flex-1", bubbleClassName)}>
        {children}
      </PockeBubble>
    </div>
  );
}
