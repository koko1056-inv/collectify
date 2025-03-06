import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getRandomUserItem } from "@/utils/tag-operations";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Share2 } from "lucide-react";
import { ShareModal } from "@/components/ShareModal";
import { useNavigate } from "react-router-dom";

interface RandomCollectionItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
}

export function RandomCollectionItemModal({
  isOpen,
  onClose,
  userId,
}: RandomCollectionItemModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [randomItem, setRandomItem] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const effectiveUserId = userId || user?.id;

  const fetchRandomItem = async () => {
    if (!effectiveUserId) return;
    
    setIsLoading(true);
    try {
      const item = await getRandomUserItem(effectiveUserId);
      setRandomItem(item);
      
      if (!item) {
        toast({
          title: "アイテムがありません",
          description: "コレクションにアイテムがありません。",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching random item:", error);
      toast({
        title: "エラーが発生しました",
        description: "ランダムアイテムの取得に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && effectiveUserId) {
      fetchRandomItem();
    }
  }, [isOpen, effectiveUserId]);

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleImageClick = () => {
    if (randomItem && effectiveUserId) {
      onClose();
      navigate(`/user/${effectiveUserId}?itemId=${randomItem.id}`);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>今日のコレクション</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-48 w-full rounded-md" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : randomItem ? (
              <div className="flex flex-col items-center space-y-4">
                <div 
                  className="w-full max-w-[240px] mx-auto cursor-pointer transition-transform hover:scale-105"
                  onClick={handleImageClick}
                >
                  <img 
                    src={randomItem.image} 
                    alt={randomItem.title} 
                    className="w-full h-auto object-contain rounded-md"
                  />
                </div>
                <h3 className="font-bold text-lg text-center">{randomItem.title}</h3>
                
                {randomItem.user_item_tags && randomItem.user_item_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {randomItem.user_item_tags.map((tag: any) => (
                      <span 
                        key={tag.tags.id} 
                        className="bg-gray-100 text-xs px-2 py-1 rounded-full"
                      >
                        {tag.tags.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-500">
                コレクションにアイテムがありません。
              </p>
            )}
          </div>
          
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={fetchRandomItem}
                disabled={isLoading}
              >
                抽選する
              </Button>
              {randomItem && (
                <Button
                  variant="outline"
                  onClick={handleShare}
                  disabled={isLoading}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  共有する
                </Button>
              )}
            </div>
            <Button onClick={onClose}>閉じる</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {randomItem && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title={`コレクション: ${randomItem.title}`}
          url={window.location.href}
          image={randomItem.image}
        />
      )}
    </>
  );
}
