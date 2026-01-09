import { useChallenges } from "@/hooks/challenges";
import { ChallengeCard } from "./ChallengeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChallengesGridProps {
  onCreateChallenge: () => void;
}

export function ChallengesGrid({ onCreateChallenge }: ChallengesGridProps) {
  const { data: challenges, isLoading, error } = useChallenges();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        エラーが発生しました
      </div>
    );
  }

  if (!challenges?.length) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="font-semibold text-lg mb-2">チャレンジがありません</h3>
        <p className="text-muted-foreground mb-4">
          最初のチャレンジを作成して、コミュニティを盛り上げましょう！
        </p>
        <Button onClick={onCreateChallenge}>
          チャレンジを作成
        </Button>
      </div>
    );
  }

  // Sort: active first, then by ends_at
  const sortedChallenges = [...challenges].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;
    return new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime();
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sortedChallenges.map((challenge) => (
        <ChallengeCard key={challenge.id} challenge={challenge} />
      ))}
    </div>
  );
}
