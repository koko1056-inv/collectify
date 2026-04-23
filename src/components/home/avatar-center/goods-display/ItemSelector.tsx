import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserItem } from "./types";

interface Props {
  userId?: string;
  selectedItems: UserItem[];
  onItemToggle: (item: UserItem) => void;
  isOpen: boolean;
}

export function ItemSelector({
  userId,
  selectedItems,
  onItemToggle,
  isOpen,
}: Props) {
  const { data: userItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["user-items", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as UserItem[];
    },
    enabled: isOpen && !!userId,
  });

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        展示するグッズを選択 ({selectedItems.length}/5)
      </label>
      <ScrollArea className="h-[400px] border rounded-lg p-4">
        {isLoadingItems ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : userItems.length === 0 ? (
          <p className="text-center text-muted-foreground p-8">
            コレクションにグッズがありません
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {userItems.map((item) => {
              const isSelected = selectedItems.some((i) => i.id === item.id);
              return (
                <div
                  key={item.id}
                  className={`relative border rounded-lg p-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary ring-2 ring-primary"
                      : "border-border"
                  }`}
                  onClick={() => onItemToggle(item)}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full aspect-square object-cover rounded mb-2"
                  />
                  <p className="text-xs truncate">{item.title}</p>
                  <Checkbox
                    checked={isSelected}
                    className="absolute top-2 right-2"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
