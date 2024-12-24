import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

interface ItemOwnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  itemId: string;
}

interface ItemOwner {
  user_id: string;
  user: {
    username: string | null;
    avatar_url: string | null;
    display_name: string | null;
  } | null;
}

export function ItemOwnersModal({
  isOpen,
  onClose,
  itemTitle,
  itemId,
}: ItemOwnersModalProps) {
  const navigate = useNavigate();

  const { data: owners = [], isLoading } = useQuery({
    queryKey: ["item-owners", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select(`
          user_id,
          user:profiles(
            username,
            avatar_url,
            display_name
          )
        `)
        .eq("title", itemTitle)
        .eq("is_shared", true);

      if (error) {
        console.error("Error fetching item owners:", error);
        throw error;
      }

      return (data || []) as ItemOwner[];
    },
  });

  const handleUserClick = (userId: string) => {
    navigate(`/user/${userId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold mb-4">
            {itemTitle}を持っているユーザー
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))
          ) : owners.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              このアイテムを持っているユーザーはまだいません
            </p>
          ) : (
            owners.map((owner) => (
              <div
                key={owner.user_id}
                className="flex items-center space-x-4 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                onClick={() => handleUserClick(owner.user_id)}
              >
                <Avatar>
                  <AvatarImage src={owner.user?.avatar_url || ""} />
                  <AvatarFallback>
                    {(owner.user?.display_name || owner.user?.username || "User")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">
                  {owner.user?.display_name || owner.user?.username || "Unknown User"}
                </span>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}