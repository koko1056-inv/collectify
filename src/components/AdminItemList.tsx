
import { Trash } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export function AdminItemList() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["official-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select("*")
        .is("merged_into", null)
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

      toast.success(t("chrome.itemDetails.deletedTitle"), {
        description: t("chrome.adminItems.deletedDesc"),
      });

      queryClient.invalidateQueries({ queryKey: ["official-items"] });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(t("chrome.common.error"), {
        description: t("chrome.itemDetails.deleteFailed"),
      });
    } finally {
      setDeletingItemId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("chrome.adminItems.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>{t("chrome.common.loading")}</div>
        ) : (
          <div className="space-y-4">
            {items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.price}</p>
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
            <AlertDialogTitle>{t("chrome.adminItems.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chrome.adminItems.deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("chrome.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingItemId && handleDelete(deletingItemId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("chrome.itemDetails.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
