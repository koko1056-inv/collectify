import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Users, Clock, Vote, ImagePlus, Medal, Package, TrendingUp } from "lucide-react";
import { useChallenge, useChallengeEntries, useVoteForEntry, useEndChallenge } from "@/hooks/challenges";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, isPast, parseISO, format } from "date-fns";
import { ja } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { ChallengeEntryModal } from "./ChallengeEntryModal";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  const totalVotes = entries?.reduce((sum, e) => sum + (e._count?.votes || 0), 0) || 0;

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

  const getRankBadge = (index: number, voteCount: number) => {
    if (voteCount === 0) return null;
    if (index === 0) return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500 text-white text-xs font-bold">
        <Medal className="h-3.5 w-3.5" />
        1位
      </div>
    );
    if (index === 1) return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-400 text-white text-xs font-bold">
        <Medal className="h-3.5 w-3.5" />
        2位
      </div>
    );
    if (index === 2) return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-600 text-white text-xs font-bold">
        <Medal className="h-3.5 w-3.5" />
        3位
      </div>
    );
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
        {index + 1}位
      </div>
    );
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

            {/* 紐づけられたグッズ */}
            {challenge.official_items && (
              <div className="flex items-center gap-3 mt-4 p-3 rounded-lg border bg-muted/30">
                <img
                  src={challenge.official_items.image}
                  alt={challenge.official_items.title}
                  className="w-14 h-14 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                    <Package className="h-3 w-3" />
                    対象グッズ
                  </div>
                  <p className="font-medium truncate">{challenge.official_items.title}</p>
                </div>
              </div>
            )}

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
            {/* リアルタイムランキングヘッダー */}
            {!entriesLoading && sortedEntries.length > 0 && (
              <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">リアルタイムランキング</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  総投票数: <span className="font-bold text-foreground">{totalVotes}</span>票
                </div>
              </div>
            )}

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
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {sortedEntries.map((entry, index) => {
                    const isMyVote = userVotedEntryId === entry.id;
                    const isMyEntry = entry.user_id === user?.id;
                    const voteCount = entry._count?.votes || 0;
                    const votePercentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                    
                    return (
                      <motion.div 
                        key={entry.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          "relative rounded-lg overflow-hidden border bg-card",
                          index < 3 && voteCount > 0 && "ring-2",
                          index === 0 && voteCount > 0 && "ring-yellow-500/50",
                          index === 1 && voteCount > 0 && "ring-gray-400/50",
                          index === 2 && voteCount > 0 && "ring-amber-600/50"
                        )}
                      >
                        <div className="flex gap-3 p-3">
                          {/* ランク表示 */}
                          <div className="flex-shrink-0 flex flex-col items-center justify-center w-12">
                            {getRankBadge(index, voteCount)}
                          </div>

                          {/* 画像 */}
                          <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                            <img 
                              src={entry.image_url} 
                              alt="" 
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* 情報 */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={entry.profiles?.avatar_url} />
                                  <AvatarFallback className="text-[10px]">{entry.profiles?.username?.[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium truncate">
                                  {entry.profiles?.username}
                                </span>
                              </div>
                              {entry.caption && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {entry.caption}
                                </p>
                              )}
                            </div>

                            {/* 投票バー */}
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <motion.span 
                                  key={voteCount}
                                  initial={{ scale: 1.2 }}
                                  animate={{ scale: 1 }}
                                  className="font-bold text-primary"
                                >
                                  {voteCount}票
                                </motion.span>
                                <span className="text-muted-foreground">
                                  {votePercentage.toFixed(0)}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <motion.div 
                                  className={cn(
                                    "h-full rounded-full",
                                    index === 0 && "bg-yellow-500",
                                    index === 1 && "bg-gray-400",
                                    index === 2 && "bg-amber-600",
                                    index > 2 && "bg-primary"
                                  )}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${votePercentage}%` }}
                                  transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* 投票ボタン */}
                          {!isEnded && !isMyEntry && user && (
                            <div className="flex-shrink-0 flex items-center">
                              <Button
                                variant={isMyVote ? "default" : "outline"}
                                size="sm"
                                className="gap-1.5"
                                onClick={() => handleVote(entry.id)}
                                disabled={voteForEntry.isPending}
                              >
                                <Vote className="h-4 w-4" />
                                {isMyVote ? "済" : "投票"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
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
