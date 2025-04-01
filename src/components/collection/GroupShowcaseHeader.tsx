
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface GroupShowcaseHeaderProps {
  onCreateClick: () => void;
}

export function GroupShowcaseHeader({ onCreateClick }: GroupShowcaseHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-800">マイショーケース</h2>
      <Button
        size="sm"
        onClick={onCreateClick}
        className="flex items-center gap-1 text-xs"
      >
        <Plus className="h-3.5 w-3.5" />
        グループ作成
      </Button>
    </div>
  );
}
