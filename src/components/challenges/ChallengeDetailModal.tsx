import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Users, Clock, Vote, ImagePlus, Medal } from "lucide-react";
import { useChallenge, useChallengeEntries, useVoteForEntry, useEndChallenge } from "@/hooks/challenges";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, isPast, parseISO, format } from "date-fns";
import { ja } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { ChallengeEntryModal } from "./ChallengeEntryModal";
import { cn } from "@/lib/utils";

interface ChallengeDetailModalProps {
  challengeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChallengeDetailModal({ challengeId, isOpen, onClose }: ChallengeDetailModalProps) {
  const { user } = useAuth();
  const { data: challenge, isLoading: challengeLoading } = useChallenge(challengeId);
  const { data: entries, isLoading: entriesLoading } = useChallengeEntries(challengeId);
  const voteForEntry = useVoteForEntry();
  const endChallenge = useEndChallenge();
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

  const isEnded = challenge?.status === "ended" || (challenge && isPast(parseISO(challenge.ends_at)));
  const isOwner = user?.id === challenge?.user_id;
  const hasEntered = entries?.some(e => e.user_id === user?.id);
  const userVotedEntryId = entries?.find(e => e.challenge_votes?.some(v => v.user_id === user?.id))?.id;

  // Sort entries by vote count
  const sortedEntries = [...(entries || [])].sort((a, b) => 
    (b._count?.votes || 0) - (a._count?.votes || 0)
  );

  const handleVote = (entryId: string) => {
    if (!user || isEnded) return;
    const hasVoted = userVotedEntryId === entryId;
    voteForEntry.mutate({ challengeId, entryId, hasVoted });
  };

  const handleEndChallenge = () => {
    if (!isOwner) return;
    endChallenge.mutate(challengeId);
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Medal className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return null;
  };

  if (challengeLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </DialogContent>
      </Dialog>
    );
  }

  if (!challenge) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl">{challenge.title}</DialogTitle>
                {challenge.description && (
                  <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>
                )}
              </div>
              <Badge variant={isEnded ? "secondary" : "default"}>
                {isEnded ? "終了" : "開催中"}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={challenge.profiles?.avatar_url} />
                  <AvatarFallback>{challenge.profiles?.username?.[0]}</AvatarFallback>
                </Avatar>
                <span>{challenge.profiles?.username}</span>
              </div>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                {entries?.length || 0}人参加
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {isEnded 
                  ? `${format(parseISO(challenge.ends_at), "M/d", { locale: ja })}に終了` 
                  : formatDistanceToNow(parseISO(challenge.ends_at), { locale: ja, addSuffix: true })}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-4 p-3 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div className="flex gap-4 text-sm">
                <span>🥇 {challenge.first_place_points}pt</span>
                <span>🥈 {challenge.second_place_points}pt</span>
                <span>🥉 {challenge.third_place_points}pt</span>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 p-6">
            {entriesLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : sortedEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ImagePlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>まだ参加者がいません</p>
                <p className="text-sm">最初の参加者になりましょう！</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {sortedEntries.map((entry, index) => {
                  const isMyVote = userVotedEntryId === entry.id;
                  const isMyEntry = entry.user_id === user?.id;
                  
                  return (
                    <div 
                      key={entry.id} 
                      className={cn(
                        "relative rounded-lg overflow-hidden border bg-card",
                        isEnded && index < 3 && "ring-2 ring-primary/20"
                      )}
                    >
                      <div className="aspect-square relative">
                        <img 
                          src={entry.image_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                        {isEnded && index < 3 && (
                          <div className="absolute top-2 left-2">
                            {getRankBadge(index)}
                          </div>
                        )}
                      </div>

                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={entry.profiles?.avatar_url} />
                              <AvatarFallback>{entry.profiles?.username?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate">
                              {entry.profiles?.username}
                            </span>
                          </div>
                          <Badge variant="outline" className="flex-shrink-0">
                            {entry._count?.votes || 0}票
                          </Badge>
                        </div>

                        {entry.caption && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {entry.caption}
                          </p>
                        )}

                        {!isEnded && !isMyEntry && user && (
                          <Button
                            variant={isMyVote ? "default" : "outline"}
                            size="sm"
                            className="w-full gap-2"
                            onClick={() => handleVote(entry.id)}
                            disabled={voteForEntry.isPending}
                          >
                            <Vote className="h-4 w-4" />
                            {isMyVote ? "投票済み" : "投票する"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t flex gap-2">
            {!isEnded && !hasEntered && user && (
              <Button onClick={() => setIsEntryModalOpen(true)} className="flex-1 gap-2">
                <ImagePlus className="h-4 w-4" />
                参加する
              </Button>
            )}
            {isOwner && !isEnded && (
              <Button 
                variant="secondary" 
                onClick={handleEndChallenge}
                disabled={endChallenge.isPending}
              >
                {endChallenge.isPending ? "終了処理中..." : "チャレンジを終了"}
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ChallengeEntryModal
        challengeId={challengeId}
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
      />
    </>
  );
}
