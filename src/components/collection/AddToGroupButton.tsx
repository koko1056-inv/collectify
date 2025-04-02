
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getAvailableGroups, addSingleItemToGroup } from "@/utils/tag/tag-groups";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface AddToGroupButtonProps {
  itemId: string;
}

export function AddToGroupButton({ itemId }: AddToGroupButtonProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);

  // ユーザーのグループを取得
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["available-groups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return getAvailableGroups(user.id);
    },
    enabled: !!user?.id && isOpen,
  });

  // グループにアイテムを追加
  const handleAddToGroup = async (groupId: string) => {
    if (!user?.id) return;
    
    setIsAdding(groupId);
    
    try {
      const result = await addSingleItemToGroup(groupId, itemId);
      
      if (result.success) {
        toast.success(result.message || "アイテムをグループに追加しました");
        setIsOpen(false);
      } else {
        toast.error(result.message || "グループへの追加に失敗しました");
      }
    } catch (error) {
      console.error("Error adding item to group:", error);
      toast.error("処理中にエラーが発生しました");
    } finally {
      setIsAdding(null);
    }
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="absolute top-1/2 -right-4 transform -translate-y-1/2 bg-white rounded-full shadow-md hover:bg-gray-100 h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-52 p-2" side="right">
        <div className="text-sm font-medium mb-2">グループに追加</div>
        
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-sm text-gray-500 py-1">
            グループがありません
          </div>
        ) : (
          <div className="space-y-1">
            {groups.map((group) => (
              <Button
                key={group.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => handleAddToGroup(group.id)}
                disabled={isAdding !== null}
              >
                {isAdding === group.id ? "追加中..." : group.name}
              </Button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
