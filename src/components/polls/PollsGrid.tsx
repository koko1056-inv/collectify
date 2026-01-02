import { usePolls } from "@/hooks/polls/usePollsQuery";
import { PollCard } from "./PollCard";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyPollsState } from "./EmptyPollsState";

interface PollsGridProps {
  onCreatePoll?: () => void;
}

export function PollsGrid({ onCreatePoll }: PollsGridProps) {
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
    return <EmptyPollsState onCreatePoll={onCreatePoll} />;
  }

  return (
    <div className="space-y-4">
      {polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} />
      ))}
    </div>
  );
}
