import { cn } from "@/lib/utils";

/**
 * 推しグッズの順位の丸（1〜5）。プロフィールと推しフォトの画面で同じものを使う。
 * 以前のお気に入りTOP5と同じく、色で序列を付けすぎないよう 1位だけ primary、ほかは落ち着いた白地にする
 */
export function RankBadge({ rank, className }: { rank: number; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums shadow-md",
        rank === 1
          ? "bg-primary text-primary-foreground"
          : "bg-background text-foreground ring-1 ring-inset ring-foreground/10",
        className
      )}
    >
      {rank}
    </span>
  );
}
