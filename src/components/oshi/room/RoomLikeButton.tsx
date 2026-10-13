import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { roomLikeErrorCode, useOshiRoomLikes, useToggleOshiRoomLike, type OshiRoomLikes } from "@/hooks/useOshiRoomSocial";
import { cn } from "@/lib/utils";

/**
 * 推しの部屋へのいいね（ハート）。押すとハートが弾んで、小さなハートが散る。
 * 数は押した瞬間に動かし、サーバーの答えでそろえる（useToggleOshiRoomLike）。自分の部屋には出さない（呼ぶ側で分ける）。
 * initial は一覧で受け取った数（開いたときに「0 → n」とちらつかないように、取り直すまでの仮の値にする）
 */
export function RoomLikeButton({
  ownerId,
  initial,
  size = "md",
  className,
}: {
  ownerId: string;
  initial?: OshiRoomLikes;
  size?: "sm" | "md";
  className?: string;
}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const reduceMotion = !!useReducedMotion();
  const likes = useOshiRoomLikes(ownerId);
  const toggle = useToggleOshiRoomLike();
  const [burst, setBurst] = useState(0);

  const current: OshiRoomLikes = likes.data ?? initial ?? { likes: 0, likedByMe: false };
  // 見られない部屋（非公開になった・ブロックの関係）は、押せる形にしない
  const unavailable = likes.isSuccess && likes.data === null;

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || unavailable || toggle.isPending) return;
    const next = !current.likedByMe;
    if (next) setBurst((n) => n + 1);
    toggle.mutate(
      { ownerId, liked: next, current },
      {
        onError: (err) => {
          const code = roomLikeErrorCode(err);
          toast.error(code === "unavailable" || code === "blocked" || code === "own" ? t("oshiRoom.social.likeUnavailable") : t("oshiRoom.social.likeFailed"));
        },
      }
    );
  };

  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!user || unavailable}
      aria-pressed={current.likedByMe}
      aria-label={t("oshiRoom.social.likeAria", { n: current.likes })}
      title={current.likedByMe ? t("oshiRoom.social.unlike") : t("oshiRoom.social.like")}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full border font-bold tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50",
        size === "sm" ? "h-8 px-2.5 text-xs" : "h-10 px-3.5 text-sm",
        current.likedByMe ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-accent",
        className
      )}
    >
      <span className="relative inline-flex">
        <motion.span
          key={burst}
          className="inline-flex"
          initial={burst > 0 && !reduceMotion ? { scale: 0.6 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 14 }}
        >
          <Heart className={cn(icon, current.likedByMe && "fill-primary text-primary")} />
        </motion.span>
        {/* 押したときに散る小さなハート（動きを減らす設定では出さない） */}
        <AnimatePresence>
          {burst > 0 && current.likedByMe && !reduceMotion && (
            <motion.span key={`b${burst}`} className="pointer-events-none absolute inset-0" aria-hidden="true" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.8, delay: 0.25 }}>
              {[-60, -20, 20, 60].map((deg, i) => (
                <motion.span
                  key={deg}
                  className="absolute left-1/2 top-1/2"
                  initial={{ x: "-50%", y: "-50%", scale: 0.4 }}
                  animate={{ x: `calc(-50% + ${Math.sin((deg * Math.PI) / 180) * 18}px)`, y: `calc(-50% - ${14 + (i % 2) * 6}px)`, scale: 0.8 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  <Heart className="h-2.5 w-2.5 fill-primary text-primary" />
                </motion.span>
              ))}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span>{current.likes}</span>
    </button>
  );
}
