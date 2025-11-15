import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Poll } from "@/types/polls";
import { useVotePoll } from "@/hooks/polls/usePollMutations";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

interface PollCardProps {
  poll: Poll;
}

export function PollCard({ poll }: PollCardProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<string | null>(null);
  const votePoll = useVotePoll();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // ユーザーの投票を取得
        const { data } = await supabase
          .from("poll_votes")
          .select("poll_option_id")
          .eq("poll_id", poll.id)
          .eq("user_id", user.id)
          .single();
        
        if (data) {
          setUserVote(data.poll_option_id);
        }
      }
    };
    fetchUser();
  }, [poll.id]);

  const totalVotes = poll.poll_options?.reduce(
    (sum, option) => sum + (option._count?.poll_votes || 0),
    0
  ) || 0;

  const handleVote = (optionId: string) => {
    votePoll.mutate(
      { pollId: poll.id, optionId },
      {
        onSuccess: () => {
          setUserVote(optionId);
        },
      }
    );
  };

  const isExpired = poll.ends_at && new Date(poll.ends_at) < new Date();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={poll.profiles?.avatar_url} />
            <AvatarFallback>
              {poll.profiles?.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-sm">{poll.profiles?.username}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(poll.created_at).toLocaleDateString("ja-JP")}
            </p>
          </div>
          {poll.ends_at && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {isExpired ? (
                <span className="text-destructive font-semibold">投票終了</span>
              ) : (
                <span>
                  残り{formatDistanceToNow(new Date(poll.ends_at), { locale: ja })}
                </span>
              )}
            </div>
          )}
        </div>
        <h3 className="text-lg font-bold">{poll.title}</h3>
        {poll.description && (
          <p className="text-sm text-muted-foreground">{poll.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {poll.poll_options?.map((option) => {
          const voteCount = option._count?.poll_votes || 0;
          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
          const isUserVote = userVote === option.id;

          return (
            <div key={option.id}>
              <Button
                variant={isUserVote ? "default" : "outline"}
                className="w-full justify-start h-auto py-3 relative overflow-hidden"
                onClick={() => !isExpired && handleVote(option.id)}
                disabled={isExpired || votePoll.isPending}
              >
                <div
                  className="absolute inset-0 bg-primary/10 transition-all"
                  style={{ width: `${percentage}%` }}
                />
                <div className="relative flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    {isUserVote && <CheckCircle2 className="h-4 w-4" />}
                    {option.text}
                  </span>
                  <span className="text-sm font-semibold">
                    {voteCount}票 ({percentage.toFixed(0)}%)
                  </span>
                </div>
              </Button>
            </div>
          );
        })}
        
        <div className="text-xs text-muted-foreground text-center pt-2">
          合計 {totalVotes} 票
        </div>
      </CardContent>
    </Card>
  );
}
