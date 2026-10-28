import { cn } from "@/lib/utils";

/**
 * 文字だけの投稿の「表紙」。タイル（投稿のマス・「みんな」の並び）で写真のかわりに置く。
 * 写真と並んでも浮かないよう、ブランド色をうすく敷いた面に本文を数行だけ出す（色はテーマのトークンだけ）。
 * #タグ は色を変えるだけ（マス全体が1つのボタンなので、タグはここでは押せない）。
 */
export function TextPostCover({
  caption,
  lines = 5,
  className,
}: {
  caption: string;
  /** 何行まで出すか（マスの大きさに合わせる） */
  lines?: 3 | 4 | 5 | 6;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center bg-gradient-to-br from-primary/15 via-primary/5 to-accent/20 p-3 text-left",
        className
      )}
    >
      <p
        className={cn(
          "w-full whitespace-pre-wrap break-words text-xs font-medium leading-relaxed text-foreground",
          lines === 3 && "line-clamp-3",
          lines === 4 && "line-clamp-4",
          lines === 5 && "line-clamp-5",
          lines === 6 && "line-clamp-6"
        )}
      >
        {caption.split(/(#[^\s#]+)/g).map((part, i) =>
          part.startsWith("#") && part.length > 1 ? (
            <span key={i} className="text-primary">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
    </div>
  );
}
