import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ItemMemoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
}

interface MemoryForm {
  comment: string;
}

export function ItemMemoriesModal({ isOpen, onClose, itemId, itemTitle }: ItemMemoriesModalProps) {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const form = useForm<MemoryForm>();

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const onSubmit = async (data: MemoryForm) => {
    try {
      let imageUrl = null;

      if (selectedImage) {
        const fileExt = selectedImage.name.split(".").pop();
        const filePath = `${itemId}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("kuji_images")
          .upload(filePath, selectedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("kuji_images")
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
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
        title: "思い出を追加しました",
        description: "コレクションに新しい思い出が追加されました。",
      });

      form.reset();
      setSelectedImage(null);
      refetch();
    } catch (error) {
      console.error("Error adding memory:", error);
      toast({
        title: "エラー",
        description: "思い出の追加に失敗しました。",
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
        <div className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>コメント</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="思い出を書いてください..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>画像</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                </FormControl>
              </FormItem>
              <Button type="submit" className="w-full">
                思い出を追加
              </Button>
            </form>
          </Form>

          <div className="space-y-4 mt-6">
            <h3 className="font-medium text-lg">これまでの思い出</h3>
            {memories.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                まだ思い出が登録されていません
              </p>
            ) : (
              memories.map((memory) => (
                <div
                  key={memory.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  {memory.image_url && (
                    <img
                      src={memory.image_url}
                      alt="思い出の画像"
                      className="w-full h-48 object-cover rounded-md"
                    />
                  )}
                  {memory.comment && (
                    <p className="text-gray-700">{memory.comment}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {new Date(memory.created_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}