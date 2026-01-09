import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Clock, ChevronRight } from "lucide-react";
import { Challenge } from "@/types/challenges";
import { formatDistanceToNow, isPast, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { ChallengeDetailModal } from "./ChallengeDetailModal";

interface ChallengeCardProps {
  challenge: Challenge;
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const isEnded = challenge.status === "ended" || isPast(parseISO(challenge.ends_at));
  const timeLeft = formatDistanceToNow(parseISO(challenge.ends_at), { locale: ja, addSuffix: true });

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={challenge.profiles?.avatar_url} />
                <AvatarFallback>{challenge.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{challenge.profiles?.username}</p>
              </div>
            </div>
            <Badge variant={isEnded ? "secondary" : "default"} className="flex-shrink-0">
              {isEnded ? "終了" : "開催中"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <h3 className="font-bold text-lg mb-2 line-clamp-2">{challenge.title}</h3>
          {challenge.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {challenge.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {challenge._count?.entries || 0}人参加
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {isEnded ? "終了" : timeLeft}
            </span>
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-yellow-500" />
              <span>1位 {challenge.first_place_points}pt</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsDetailOpen(true)}
              className="gap-1"
            >
              詳細を見る
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <ChallengeDetailModal 
        challengeId={challenge.id}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </>
  );
}
