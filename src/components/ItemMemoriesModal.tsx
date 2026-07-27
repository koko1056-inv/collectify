import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MemoriesForm } from "./collection/MemoriesForm";
import { MemoriesList } from "./collection/MemoriesList";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";

interface ItemMemoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemIds: string[];
  itemTitles: string[];
  userId?: string;
}

export function ItemMemoriesModal({ isOpen, onClose, itemIds, itemTitles, userId }: ItemMemoriesModalProps) {
  const { t } = useLanguage();
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

      toast.success(isOwner ? t("chrome.memories.addedMemoryTitle") : t("chrome.memories.addedCommentTitle"), {
        description: isOwner 
          ? t("chrome.memories.addedMemoryDesc")
          : t("chrome.memories.addedCommentDesc"),
      });
    } catch (error) {
      console.error("Error adding memory:", error);
      toast.error(t("chrome.common.error"), {
        description: isOwner 
          ? t("chrome.memories.addMemoryFailed")
          : t("chrome.memories.addCommentFailed"),
      });
    }
  };

  const title = itemTitles && itemTitles.length === 1 
    ? t("chrome.memories.titleSingle", { title: itemTitles[0] })
    : t("chrome.memories.titleMultiple", { n: itemTitles?.length || 0 });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {t("chrome.memories.description")}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[70vh]">
          <div className="space-y-6 pr-4">
            <MemoriesForm onSubmit={handleSubmit} />
            <div className="space-y-4 mt-6">
              <h3 className="font-medium text-lg">{t("chrome.memories.pastMemories")}</h3>
              <MemoriesList memories={memories} />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}