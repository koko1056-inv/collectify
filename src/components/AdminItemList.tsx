
import { Trash } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export function AdminItemList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["official-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    try {
      // まず関連するタグを削除
      await supabase
        .from("item_tags")
        .delete()
        .eq("official_item_id", id);

      // 次にアイテムを削除
      const { error } = await supabase
        .from("official_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "アイテムを削除しました",
        description: "公式グッズリストからアイテムが削除されました。",
      });

      queryClient.invalidateQueries({ queryKey: ["official-items"] });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "エラー",
        description: "アイテムの削除に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setDeletingItemId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>公式グッズ一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>読み込み中...</div>
        ) : (
          <div className="space-y-4">
            {items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.price}</p>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setDeletingItemId(item.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deletingItemId} onOpenChange={() => setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>アイテムを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。このアイテムに関連するすべてのデータ（タグなど）も削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingItemId && handleDelete(deletingItemId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
