import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MemoriesForm } from "./collection/MemoriesForm";
import { MemoriesList } from "./collection/MemoriesList";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ItemMemoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
  userId?: string;
}

export function ItemMemoriesModal({ isOpen, onClose, itemId, itemTitle, userId }: ItemMemoriesModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isOwner = !userId || (user && user.id === userId);

  const { data: memories = [], refetch } = useQuery({
    queryKey: ["item-memories", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_memories")
        .select("*")
        .eq("user_item_id", itemId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (data: { comment: string }, selectedImage: File | null) => {
    try {
      let imageUrl = null;

      if (selectedImage) {
        const timestamp = Date.now();
        const fileExt = selectedImage.name.split(".").pop();
        const fileName = `${timestamp}-${crypto.randomUUID()}.${fileExt}`;
        const filePath = `memories/${itemId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("kuji_images")
          .upload(filePath, selectedImage, {
            cacheControl: "3600",
            upsert: false,
            contentType: selectedImage.type
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }

        // Get the public URL after successful upload
        const { data: { publicUrl } } = supabase.storage
          .from("kuji_images")
          .getPublicUrl(filePath);

        if (!publicUrl) {
          throw new Error("Failed to get public URL for uploaded image");
        }

        imageUrl = publicUrl;
        console.log("Image uploaded successfully. Public URL:", imageUrl);
      }

      const { error } = await supabase
        .from("item_memories")
        .insert({
          user_item_id: itemId,
          comment: data.comment,
          image_url: imageUrl,
        });

      if (error) throw error;

      toast({
        title: isOwner ? "思い出を追加しました" : "コメントを追加しました",
        description: isOwner 
          ? "コレクションに新しい思い出が追加されました。"
          : "コレクションにコメントが追加されました。",
      });

      refetch();
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{itemTitle}の思い出</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh]">
          <div className="space-y-6 pr-4">
            <MemoriesForm isOwner={isOwner} onSubmit={handleSubmit} />
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