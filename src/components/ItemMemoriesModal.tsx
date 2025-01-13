import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MemoriesForm } from "./collection/MemoriesForm";
import { MemoriesList } from "./collection/MemoriesList";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ItemMemoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemIds: string[];
  itemTitles: string[];
  userId?: string;
}

export function ItemMemoriesModal({ isOpen, onClose, itemIds, itemTitles, userId }: ItemMemoriesModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = !userId || (user && user.id === userId);

  const { data: memories = [], refetch } = useQuery({
    queryKey: ["item-memories", itemIds],
    queryFn: async () => {
      if (!itemIds.length) return [];

      const { data, error } = await supabase
        .from("item_memories")
        .select("*")
        .in("user_item_id", itemIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching memories:", error);
        throw error;
      }
      return data || [];
    },
    enabled: isOpen && itemIds.length > 0,
  });

  const handleSubmit = async (data: { comment?: string; image?: File }) => {
    try {
      let imageUrl = null;

      if (data.image) {
        const timestamp = Date.now();
        const fileExt = data.image.name.split(".").pop();
        const fileName = `${timestamp}-${crypto.randomUUID()}.${fileExt}`;
        const filePath = `memories/${itemIds[0]}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("kuji_images")
          .upload(filePath, data.image, {
            cacheControl: "3600",
            upsert: false,
            contentType: data.image.type
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("kuji_images")
          .getPublicUrl(filePath);

        if (!publicUrl) {
          throw new Error("Failed to get public URL for uploaded image");
        }

        imageUrl = publicUrl;
        console.log("Image uploaded successfully. Public URL:", imageUrl);
      }

      // Insert memories for all selected items
      const memoriesToInsert = itemIds.map(itemId => ({
        user_item_id: itemId,
        comment: data.comment || null,
        image_url: imageUrl,
      }));

      const { error } = await supabase
        .from("item_memories")
        .insert(memoriesToInsert);

      if (error) throw error;

      // Invalidate and refetch queries
      await queryClient.invalidateQueries({ queryKey: ["item-memories", itemIds] });
      await refetch();

      toast({
        title: isOwner ? "思い出を追加しました" : "コメントを追加しました",
        description: isOwner 
          ? "コレクションに新しい思い出が追加されました。"
          : "コレクションにコメントが追加されました。",
      });
    } catch (error) {
      console.error("Error adding memory:", error);
      toast({
        title: "エラー",
        description: isOwner 
          ? "思い出の追加に失敗しました。"
          : "コメントの追加に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const title = itemTitles && itemTitles.length === 1 
    ? `${itemTitles[0]}の思い出`
    : `${itemTitles?.length || 0}個のコレクションの思い出`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            コレクションの思い出やコメントを追加できます。
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[70vh]">
          <div className="space-y-6 pr-4">
            <MemoriesForm onSubmit={handleSubmit} />
            <div className="space-y-4 mt-6">
              <h3 className="font-medium text-lg">これまでの思い出</h3>
              <MemoriesList memories={memories} />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}