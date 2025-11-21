import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Dices, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ItemDetailsModal } from "@/components/ItemDetailsModal";

interface RandomPickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function RandomPickupModal({ isOpen, onClose, userId }: RandomPickupModalProps) {
  const [randomItem, setRandomItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showItemDetails, setShowItemDetails] = useState(false);
  const { toast } = useToast();

  const fetchRandomItem = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.length);
        setRandomItem(data[randomIndex]);
      } else {
        toast({
          title: "アイテムが見つかりません",
          description: "コレクションにアイテムを追加してください",
        });
      }
    } catch (error) {
      console.error("Error fetching random item:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "ランダムアイテムの取得に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !randomItem) {
      fetchRandomItem();
    }
  }, [isOpen]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dices className="w-5 h-5" />
              今日のピックアップ
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : randomItem ? (
              <div className="space-y-4">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={randomItem.image}
                    alt={randomItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-bold text-lg">{randomItem.title}</h3>
                  {randomItem.content_name && (
                    <p className="text-sm text-muted-foreground">{randomItem.content_name}</p>
                  )}
                  <p className="text-sm">{randomItem.prize}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowItemDetails(true)}
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    詳細を見る
                  </Button>
                  <Button
                    onClick={fetchRandomItem}
                    variant="outline"
                    className="flex-1"
                  >
                    <Dices className="w-4 h-4 mr-2" />
                    もう一度
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">アイテムが見つかりませんでした</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {randomItem && (
        <ItemDetailsModal
          isOpen={showItemDetails}
          onClose={() => setShowItemDetails(false)}
          title={randomItem.title}
          image={randomItem.image}
          price={randomItem.prize}
          releaseDate={randomItem.release_date}
          description={randomItem.note}
          itemId={randomItem.id}
          contentName={randomItem.content_name}
        />
      )}
    </>
  );
}
