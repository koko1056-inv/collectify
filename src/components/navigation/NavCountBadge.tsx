import { cn } from "@/lib/utils";

/**
 * ヘッダーのアイコンボタン（メッセージ・通知）の右上に載せる件数バッジ。
 *
 * 以前はメッセージが赤の20px、通知が赤の20pxで点滅（animate-pulse）しつつベルが揺れ続け、
 * 交換は primary の16pxと、3つ並んだボタンでバッジが全部違っていた。
 * ここで1つに揃える: 16px・primary・数字は 9+ まで。動かさない（件数があることは色と数字で十分伝わる）。
 * 細い背景色の縁で、下のアイコンの線と重なっても数字が読めるようにする。
 */
export function NavCountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-3xs font-bold leading-none tabular-nums text-primary-foreground ring-2 ring-background",
        className,
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
