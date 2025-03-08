
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Send, Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [isOpenTrade, setIsOpenTrade] = useState(false);
  const [activeTab, setActiveTab] = useState<"directTrade" | "openTrade">("directTrade");
  const [desiredItemId, setDesiredItemId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: userItems } = useQuery({
    queryKey: ["user-items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSubmit = async () => {
    if (!selectedItem) {
      toast({
        title: "エラー",
        description: "交換するアイテムを選択してください",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // For direct trade with specific receiver
      if (activeTab === "directTrade") {
        const { error } = await supabase.from("trade_requests").insert({
          sender_id: user?.id,
          receiver_id: receiverId,
          offered_item_id: selectedItem,
          requested_item_id: requestedItemId,
          message,
          is_open: isOpenTrade
        });

        if (error) throw error;

        toast({
          title: "トレードリクエストを送信しました",
          description: "相手からの返信をお待ちください",
        });
      } 
      // For open trade where anyone can accept
      else if (activeTab === "openTrade") {
        if (!desiredItemId) {
          toast({
            title: "エラー",
            description: "希望するアイテムを選択してください",
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase.from("trade_requests").insert({
          sender_id: user?.id,
          receiver_id: null, // No specific receiver for open trades
          offered_item_id: selectedItem,
          requested_item_id: desiredItemId,
          message,
          is_open: true // Always open for these trades
        });

        if (error) throw error;

        toast({
          title: "オープントレードを作成しました",
          description: "他のユーザーからの申し込みをお待ちください",
        });
      }
      
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
            {activeTab === "directTrade" 
              ? `「${requestedItemTitle}」との交換をリクエストします`
              : "オープントレードの作成"}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "directTrade" | "openTrade")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="directTrade">直接トレード</TabsTrigger>
            <TabsTrigger value="openTrade">オープントレード</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 px-1 h-[calc(100%-80px)]">
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
              
              {activeTab === "openTrade" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">希望するアイテムを選択してください</label>
                  <div className="grid grid-cols-2 gap-2">
                    {userItems?.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setDesiredItemId(item.id)}
                        className={`p-2 rounded-lg border transition-colors ${
                          desiredItemId === item.id
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        disabled={selectedItem === item.id} // Can't select same item for both
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
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">メッセージ</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="交換の理由や希望などを記入してください"
                  className="resize-none"
                />
              </div>
              
              {activeTab === "directTrade" && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="open-trade"
                    checked={isOpenTrade}
                    onCheckedChange={setIsOpenTrade}
                  />
                  <Label htmlFor="open-trade" className="flex items-center gap-1">
                    <Globe className="h-4 w-4 text-green-600" />
                    オープントレードとして公開する
                  </Label>
                </div>
              )}
              
              {(activeTab === "directTrade" && isOpenTrade) && (
                <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                  オープントレードにすると、特定のユーザーだけでなく、全てのユーザーがこのトレードリクエストを見ることができます。
                </div>
              )}
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
