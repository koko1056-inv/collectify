
import { Button } from "@/components/ui/button";
import { PublicCollectionGoodsCard } from "@/components/public-collection/PublicCollectionGoodsCard";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";

interface ProfileFavoritesProps {
  userId?: string;
  isEditing: boolean;
  onEditComplete: () => void;
}

export function ProfileFavorites({
  userId,
  isEditing,
  onEditComplete,
}: ProfileFavoritesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const { data: userItems = [], isError } = useQuery({
    queryKey: ["user-items", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleSaveSelection = async () => {
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ favorite_item_ids: selectedItems })
        .eq("id", userId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["user-items"] });
      toast({
        title: "更新完了",
        description: "お気に入りコレクションを更新しました",
      });
      onEditComplete();
    } catch (error) {
      console.error("Error updating favorites:", error);
      toast({
        title: "エラー",
        description: "お気に入りコレクションの更新に失敗しました",
        variant: "destructive",
      });
    }
  };

  if (isError) {
    return <div className="text-center py-4">データの取得に失敗しました</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-semibold">コレクション一覧</h2>
        {isEditing && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSelection}
              className="gap-1"
            >
              <Check className="h-4 w-4" />
              保存
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEditComplete}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              キャンセル
            </Button>
          </div>
        )}
      </div>
      {userItems.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          まだコレクションがありません
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {userItems.map((item) => (
            <PublicCollectionGoodsCard
              key={item.id}
              id={item.id}
              title={item.title}
              image={item.image}
              userId={userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
