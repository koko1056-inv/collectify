
import { useState, useEffect } from "react";
import { getRandomUserItem } from "@/utils/tag-operations";
import { useToast } from "@/hooks/use-toast";

export function useRandomItem(userId: string | null | undefined, isOpen: boolean) {
  const { toast } = useToast();
  const [randomItem, setRandomItem] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);

  const fetchRandomItem = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setIsSpinning(true);
    setRandomItem(null);
    
    try {
      // Create a delay to show the spinning animation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const item = await getRandomUserItem(userId);
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
      setTimeout(() => setIsSpinning(false), 300);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchRandomItem();
    }
  }, [isOpen, userId]);

  return {
    randomItem,
    isLoading,
    isSpinning,
    fetchRandomItem
  };
}
