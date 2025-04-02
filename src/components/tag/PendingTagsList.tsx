
import { Badge } from "@/components/ui/badge";
import { TagUpdate } from "@/types/tag";

export interface PendingTagsListProps {
  pendingUpdates: TagUpdate[];
}

export function PendingTagsList({ pendingUpdates }: PendingTagsListProps) {
  if (pendingUpdates.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {pendingUpdates.filter(update => update.value).map((update) => (
        <Badge key={update.category} variant="outline">
          {update.value}
          <span className="ml-1 text-xs text-muted-foreground">
            ({update.category})
          </span>
        </Badge>
      ))}
    </div>
  );
}
