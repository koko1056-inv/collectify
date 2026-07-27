import { useChallenges } from "@/hooks/challenges";
import { ChallengeCard } from "./ChallengeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChallengesGridProps {
  onCreateChallenge: () => void;
}

export function ChallengesGrid({ onCreateChallenge }: ChallengesGridProps) {
  const { t } = useLanguage();
  const { data: challenges, isLoading, error, refetch } = useChallenges();

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
      <QueryErrorState
        title={t("social.challenges.loadError")}
        onRetry={() => refetch()}
      />
    );
  }

  if (!challenges?.length) {
    return (
      <EmptyState
        icon={Trophy}
        title={t("social.challenges.emptyTitle")}
        description={t("social.challenges.emptyDesc")}
        action={
          <Button onClick={onCreateChallenge}>
            {t("social.challenges.create")}
          </Button>
        }
      />
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
