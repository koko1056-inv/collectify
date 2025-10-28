import { usePolls } from "@/hooks/polls/usePollsQuery";
import { PollCard } from "./PollCard";
import { Skeleton } from "@/components/ui/skeleton";

export function PollsGrid() {
  const { data: polls, isLoading } = usePolls();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (!polls || polls.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">まだ投票がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} />
      ))}
    </div>
  );
}
