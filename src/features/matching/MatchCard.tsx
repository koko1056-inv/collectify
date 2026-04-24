import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Package, Repeat, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TrustBadge } from "@/features/trust/TrustBadge";
import { StampSendButton } from "@/features/stamps/StampSendButton";
import type { MatchCandidate } from "./types";

interface Props {
  match: MatchCandidate;
  onCompare: (candidateId: string) => void;
}

export function MatchCard({ match, onCompare }: Props) {
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["match-profile", match.candidate_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio, interests")
        .eq("id", match.candidate_id)
        .maybeSingle();
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });

  if (!profile) return null;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(`/user/${profile.id}`)}>
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback>{(profile.display_name ?? profile.username ?? "?").slice(0, 1)}</AvatarFallback>
            </Avatar>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate(`/user/${profile.id}`)}
                className="font-bold text-base truncate hover:underline"
              >
                {profile.display_name ?? profile.username ?? "ユーザー"}
              </button>
              <TrustBadge userId={profile.id} size="sm" />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-amber-700">マッチ度 {Math.round(Number(match.score))}</span>
            </div>
            {profile.bio && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-pink-50 border border-pink-100 px-2 py-1.5">
            <Heart className="h-3.5 w-3.5 mx-auto text-pink-600 mb-0.5" />
            <div className="text-sm font-bold text-pink-700">{match.shared_interests}</div>
            <div className="text-[10px] text-muted-foreground">同じ趣味</div>
          </div>
          <div className="rounded-md bg-emerald-50 border border-emerald-100 px-2 py-1.5">
            <Package className="h-3.5 w-3.5 mx-auto text-emerald-600 mb-0.5" />
            <div className="text-sm font-bold text-emerald-700">{match.shared_items}</div>
            <div className="text-[10px] text-muted-foreground">被りグッズ</div>
          </div>
          <div className="rounded-md bg-violet-50 border border-violet-100 px-2 py-1.5">
            <Repeat className="h-3.5 w-3.5 mx-auto text-violet-600 mb-0.5" />
            <div className="text-sm font-bold text-violet-700">{match.tradeable_items}</div>
            <div className="text-[10px] text-muted-foreground">交換候補</div>
          </div>
        </div>

        {profile.interests && profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.interests.slice(0, 4).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onCompare(profile.id)}>
            コレクション比較
          </Button>
          <StampSendButton receiverId={profile.id} contextType="match" size="sm" label="あいさつ" />
        </div>
      </CardContent>
    </Card>
  );
}
