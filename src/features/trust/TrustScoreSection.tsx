import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { useTrustScore } from "./useTrustScore";
import { TrustBadge } from "./TrustBadge";
import { CATEGORY_LABELS } from "./types";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

interface TrustScoreSectionProps {
  userId: string;
}

export function TrustScoreSection({ userId }: TrustScoreSectionProps) {
  const { data: score, isLoading: loadingScore } = useTrustScore(userId);

  const { data: reviews, isLoading: loadingReviews } = useQuery({
    queryKey: ["trade-reviews", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_reviews")
        .select("id, rating, comment, created_at, reviewer_id")
        .eq("reviewee_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;

      const reviewerIds = Array.from(new Set((data ?? []).map((r) => r.reviewer_id)));
      let profiles: Record<string, { username: string; display_name: string | null; avatar_url: string | null }> = {};
      if (reviewerIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", reviewerIds);
        for (const p of profs ?? []) {
          profiles[p.id] = {
            username: p.username,
            display_name: p.display_name,
            avatar_url: p.avatar_url,
          };
        }
      }
      return (data ?? []).map((r) => ({ ...r, reviewer: profiles[r.reviewer_id] }));
    },
    enabled: !!userId,
  });

  if (loadingScore) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (!score) return null;

  const categories = [
    { key: "trade" as const, score: score.trade_score, count: score.trade_count },
    { key: "collector" as const, score: score.collector_score, count: score.collector_count },
    { key: "communication" as const, score: score.communication_score, count: score.communication_count },
  ];

  return (
    <div className="space-y-4">
      {/* 3カテゴリのバッジ */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">信頼度</h3>
          <TrustBadge score={score} size="md" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {categories.map((c) => (
            <div key={c.key} className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[c.key]}</p>
              <TrustBadge score={score} category={c.key} size="sm" />
              <p className="text-[10px] text-muted-foreground">{c.count}件</p>
            </div>
          ))}
        </div>
      </Card>

      {/* 取引レビュー */}
      <div>
        <h4 className="font-semibold text-sm mb-2">取引レビュー</h4>
        {loadingReviews ? (
          <Skeleton className="h-20 w-full" />
        ) : !reviews || reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">まだレビューはありません</p>
        ) : (
          <div className="space-y-2">
            {reviews.map((r) => (
              <Card key={r.id} className="p-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={r.reviewer?.avatar_url ?? undefined} />
                    <AvatarFallback>{r.reviewer?.username?.charAt(0).toUpperCase() ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {r.reviewer?.display_name || r.reviewer?.username || "匿名"}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ja })}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-3 w-3 ${
                            n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    {r.comment && <p className="text-sm mt-1 break-words">{r.comment}</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
