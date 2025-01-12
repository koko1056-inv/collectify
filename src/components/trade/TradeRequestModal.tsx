import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface TradeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestedItemId: string;
  requestedItemTitle: string;
  receiverId: string;
}

export function TradeRequestModal({
  isOpen,
  onClose,
  requestedItemId,
  requestedItemTitle,
  receiverId,
}: TradeRequestModalProps) {
  const [message, setMessage] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // First, get the user's item that matches the official item
  const { data: receiverItem, isError: receiverItemError } = useQuery({
    queryKey: ["receiver-item", requestedItemId, receiverId],
    queryFn: async () => {
      console.log("Fetching receiver item with:", { requestedItemId, receiverId });
      const { data, error } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", receiverId)
        .eq("official_item_id", requestedItemId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching receiver item:", error);
        throw error;
      }
      
      if (!data) {
        console.error("No receiver item found");
        throw new Error("No matching item found");
      }
      
      return data;
    },
    enabled: !!requestedItemId && !!receiverId,
  });

  const { data: userItems, isError: userItemsError } = useQuery({
    queryKey: ["user-items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      console.log("Fetching user items for:", user.id);
      const { data, error } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", user.id);
      
      if (error) {
        console.error("Error fetching user items:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!user,
  });

  if (receiverItemError || userItemsError) {
    toast({
      title: "エラー",
      description: "アイテムの取得に失敗しました",
      variant: "destructive",
    });
    onClose();
    return null;
  }

  const handleSubmit = async () => {
    if (!selectedItem) {
      toast({
        title: "エラー",
        description: "交換するアイテムを選択してください",
        variant: "destructive",
      });
      return;
    }

    if (!receiverItem) {
      toast({
        title: "エラー",
        description: "交換対象のアイテムが見つかりません",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from("trade_requests").insert({
        sender_id: user?.id,
        receiver_id: receiverId,
        offered_item_id: selectedItem,
        requested_item_id: receiverItem.id, // Use the actual user_item_id
        message,
      });

      if (error) throw error;

      toast({
        title: "トレードリクエストを送信しました",
        description: "相手からの返信をお待ちください",
      });
      onClose();
    } catch (error) {
      console.error("Error sending trade request:", error);
      toast({
        title: "エラー",
        description: "トレードリクエストの送信に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] h-[90vh]">
        <DialogHeader>
          <DialogTitle>トレードリクエスト</DialogTitle>
          <DialogDescription>
            「{requestedItemTitle}」との交換をリクエストします
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 px-1">
          <div className="space-y-4 pr-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">交換に出すアイテムを選択してください</label>
              <div className="grid grid-cols-2 gap-2">
                {userItems?.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item.id)}
                    className={`p-2 rounded-lg border transition-colors ${
                      selectedItem === item.id
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full aspect-square object-cover rounded-md"
                    />
                    <p className="mt-1 text-xs truncate">{item.title}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">メッセージ</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="交換の理由や希望などを記入してください"
                className="resize-none"
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            送信
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}