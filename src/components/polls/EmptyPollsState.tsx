import { Vote, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyPollsStateProps {
  onCreatePoll?: () => void;
}

export function EmptyPollsState({ onCreatePoll }: EmptyPollsStateProps) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <Vote className="w-10 h-10 text-primary" />
      </div>
      <h3 className="text-xl font-bold mb-2">みんなで投票しよう</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
        まだ投票がありません。<br />
        あなたが最初の投票を作成してみませんか？
      </p>
      {onCreatePoll && (
        <Button onClick={onCreatePoll} className="gap-2">
          <Sparkles className="w-4 h-4" />
          投票を作成する
        </Button>
      )}
    </div>
  );
}
