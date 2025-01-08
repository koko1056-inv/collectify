import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface ItemOwnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  itemImage: string;
}

export function ItemOwnersModal({
  isOpen,
  onClose,
  itemTitle,
  itemImage,
}: ItemOwnersModalProps) {
  const { data: owners, isLoading } = useQuery({
    queryKey: ["item-owners", itemTitle, itemImage],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select(`
          user_id,
          profiles (
            username,
            avatar_url,
            display_name
          )
        `)
        .eq("title", itemTitle)
        .eq("image", itemImage);

      if (error) {
        console.error("Error fetching item owners:", error);
        return [];
      }

      return data;
    },
    enabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>このアイテムを持っているユーザー</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isLoading ? (
            Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))
          ) : owners?.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              まだ誰も持っていません
            </p>
          ) : (
            owners?.map((owner) => (
              <div key={owner.user_id} className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={owner.profiles?.avatar_url || ""} />
                  <AvatarFallback>
                    {owner.profiles?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">
                  {owner.profiles?.display_name || owner.profiles?.username}
                </span>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}