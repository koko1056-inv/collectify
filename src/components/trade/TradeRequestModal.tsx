
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Send, Globe, ArrowRight } from "lucide-react";
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
  initialTab?: "directTrade" | "openTrade";
}

export function TradeRequestModal({
  isOpen,
  onClose,
  requestedItemId,
  requestedItemTitle,
  receiverId,
  initialTab = "directTrade"
}: TradeRequestModalProps) {
  const [message, setMessage] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpenTrade, setIsOpenTrade] = useState(false);
  const [activeTab, setActiveTab] = useState<"directTrade" | "openTrade">(initialTab);
  const [desiredItemId, setDesiredItemId] = useState<string | null>(null);
  const [step, setStep] = useState<"selectOffer" | "selectDesired" | "addMessage">("selectOffer");
  const { toast } = useToast();
  const { user } = useAuth();

  // Reset state when modal opens/closes or tab changes
  useEffect(() => {
    if (isOpen) {
      if (activeTab === "directTrade" && requestedItemId) {
        setDesiredItemId(requestedItemId);
      }
      
      // Reset step to first step when modal opens
      setStep("selectOffer");
      setSelectedItem(null);
      setDesiredItemId(null);
      setMessage("");
    }
  }, [isOpen, activeTab, requestedItemId]);

  // When tab changes, reset the step
  useEffect(() => {
    setStep("selectOffer");
    setSelectedItem(null);
    setDesiredItemId(null);
  }, [activeTab]);

  const { data: userItems, isLoading: itemsLoading } = useQuery({
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

  // Query for all available items for the desired item selection in open trade tab
  const { data: allItems, isLoading: allItemsLoading } = useQuery({
    queryKey: ["all-items"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_items")
        .select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user && (activeTab === "openTrade" && step === "selectDesired"),
  });

  const handleNextStep = () => {
    if (step === "selectOffer") {
      setStep("selectDesired");
    } else if (step === "selectDesired") {
      setStep("addMessage");
    }
  };

  const handlePreviousStep = () => {
    if (step === "selectDesired") {
      setStep("selectOffer");
    } else if (step === "addMessage") {
      setStep("selectDesired");
    }
  };

  const handleSubmit = async () => {
    if (!selectedItem) {
      toast({
        title: "エラー",
        description: "交換するアイテムを選択してください",
        variant: "destructive",
      });
      return;
    }

    if (activeTab === "openTrade" && !desiredItemId) {
      toast({
        title: "エラー",
        description: "希望するアイテムを選択してください",
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
      setSelectedItem(null);
      setDesiredItemId(null);
      setMessage("");
      setStep("selectOffer");
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

  // Get the current step title
  const getStepTitle = () => {
    if (activeTab === "directTrade") {
      return `「${requestedItemTitle}」との交換をリクエストします`;
    }
    
    if (step === "selectOffer") {
      return "交換に出すアイテムを選択";
    } else if (step === "selectDesired") {
      return "希望するアイテムを選択";
    } else {
      return "メッセージを追加";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>トレードリクエスト</DialogTitle>
          <DialogDescription>
            {getStepTitle()}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "directTrade" | "openTrade")} className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="directTrade">直接トレード</TabsTrigger>
            <TabsTrigger value="openTrade">オープントレード</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 pr-2 overflow-y-auto">
            <div className="space-y-4 pb-4">
              {/* Direct Trade Tab Content */}
              {activeTab === "directTrade" && (
                <>
                  {/* Offered item selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">交換に出すアイテムを選択してください</label>
                    <div className="grid grid-cols-2 gap-2">
                      {itemsLoading ? (
                        <div className="col-span-2 py-4 text-center text-gray-500">読み込み中...</div>
                      ) : userItems?.length === 0 ? (
                        <div className="col-span-2 py-4 text-center text-gray-500">アイテムがありません</div>
                      ) : (
                        userItems?.map((item) => (
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
                            <p className="mt-1 text-xs line-clamp-2 min-h-[2rem]">{item.title}</p>
                          </button>
                        ))
                      )}
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
                  
                  {isOpenTrade && (
                    <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                      オープントレードにすると、特定のユーザーだけでなく、全てのユーザーがこのトレードリクエストを見ることができます。
                    </div>
                  )}
                </>
              )}

              {/* Open Trade Tab Content - Step 1: Select Offer Item */}
              {activeTab === "openTrade" && step === "selectOffer" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">交換に出すアイテムを選択してください</label>
                  <div className="grid grid-cols-2 gap-2">
                    {itemsLoading ? (
                      <div className="col-span-2 py-4 text-center text-gray-500">読み込み中...</div>
                    ) : userItems?.length === 0 ? (
                      <div className="col-span-2 py-4 text-center text-gray-500">アイテムがありません</div>
                    ) : (
                      userItems?.map((item) => (
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
                          <p className="mt-1 text-xs line-clamp-2 min-h-[2rem]">{item.title}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Open Trade Tab Content - Step 2: Select Desired Item */}
              {activeTab === "openTrade" && step === "selectDesired" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">希望するアイテムを選択してください</label>
                  <div className="grid grid-cols-2 gap-2">
                    {allItemsLoading ? (
                      <div className="col-span-2 py-4 text-center text-gray-500">読み込み中...</div>
                    ) : allItems?.length === 0 ? (
                      <div className="col-span-2 py-4 text-center text-gray-500">アイテムがありません</div>
                    ) : (
                      allItems?.map((item) => (
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
                          <p className="mt-1 text-xs line-clamp-2 min-h-[2rem]">{item.title}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Open Trade Tab Content - Step 3: Add Message */}
              {activeTab === "openTrade" && step === "addMessage" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">交換に出すアイテム</p>
                      {selectedItem && userItems && (
                        <div className="border rounded p-2">
                          {userItems.filter(item => item.id === selectedItem).map(item => (
                            <div key={item.id} className="flex flex-col items-center">
                              <img 
                                src={item.image} 
                                alt={item.title} 
                                className="w-full aspect-square object-cover rounded-md"
                              />
                              <p className="mt-1 text-xs line-clamp-2 min-h-[2rem]">{item.title}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">希望するアイテム</p>
                      {desiredItemId && allItems && (
                        <div className="border rounded p-2">
                          {allItems.filter(item => item.id === desiredItemId).map(item => (
                            <div key={item.id} className="flex flex-col items-center">
                              <img 
                                src={item.image} 
                                alt={item.title} 
                                className="w-full aspect-square object-cover rounded-md"
                              />
                              <p className="mt-1 text-xs line-clamp-2 min-h-[2rem]">{item.title}</p>
                            </div>
                          ))}
                        </div>
                      )}
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
              )}
            </div>
          </ScrollArea>
          
          <DialogFooter className="mt-4 pt-2 border-t">
            {activeTab === "directTrade" && (
              <>
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
              </>
            )}
            
            {activeTab === "openTrade" && step === "selectOffer" && (
              <>
                <Button variant="outline" onClick={onClose}>
                  キャンセル
                </Button>
                <Button 
                  onClick={handleNextStep} 
                  disabled={!selectedItem}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  希望アイテムを選択する
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
            
            {activeTab === "openTrade" && step === "selectDesired" && (
              <>
                <Button variant="outline" onClick={handlePreviousStep}>
                  戻る
                </Button>
                <Button 
                  onClick={handleNextStep} 
                  disabled={!desiredItemId}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  次へ
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
            
            {activeTab === "openTrade" && step === "addMessage" && (
              <>
                <Button variant="outline" onClick={handlePreviousStep}>
                  戻る
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  送信
                </Button>
              </>
            )}
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
