import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Search, RefreshCw, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  shop: string;
  shopIcon: string;
  title: string;
  price: string;
  url: string;
  image?: string;
}

interface PriceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  itemImage?: string;
}

export function PriceSearchModal({
  isOpen,
  onClose,
  itemTitle,
  itemImage,
}: PriceSearchModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('search-item-prices', {
        body: { itemTitle },
      });

      if (error) throw error;

      if (data.success) {
        setResults(data.data || []);
        if (data.data?.length === 0) {
          toast({
            title: "検索完了",
            description: "該当する商品が見つかりませんでした",
          });
        }
      } else {
        throw new Error(data.error || '検索に失敗しました');
      }
    } catch (error) {
      console.error('Price search error:', error);
      toast({
        title: "エラー",
        description: "価格検索に失敗しました。しばらく経ってから再試行してください。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setResults([]);
    setHasSearched(false);
    onClose();
  };

  // Group results by shop
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.shop]) {
      acc[result.shop] = [];
    }
    acc[result.shop].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            価格検索
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          {itemImage && (
            <img
              src={itemImage}
              alt={itemTitle}
              className="w-16 h-16 object-cover rounded-md"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2">{itemTitle}</h3>
          </div>
        </div>

        {!hasSearched ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-muted-foreground text-center">
              メルカリ、Amazon、eBay、楽天、ヤフオクで<br />
              このアイテムの価格を検索します
            </p>
            <Button onClick={handleSearch} size="lg" className="gap-2">
              <Search className="w-4 h-4" />
              価格を検索
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-4 py-4 flex-1 overflow-auto">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <div className="space-y-2 pl-4">
                  {[...Array(2)].map((_, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-muted-foreground">該当する商品が見つかりませんでした</p>
            <Button onClick={handleSearch} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              再検索
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-6 py-4">
            {Object.entries(groupedResults).map(([shop, shopResults]) => (
              <div key={shop}>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <span>{shopResults[0]?.shopIcon}</span>
                  {shop}
                  <span className="text-muted-foreground text-xs">
                    ({shopResults.length}件)
                  </span>
                </h4>
                <div className="space-y-2 pl-2">
                  {shopResults.map((result, idx) => (
                    <a
                      key={idx}
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      {result.image ? (
                        <img
                          src={result.image}
                          alt=""
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-2xl">
                          {result.shopIcon}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-1 group-hover:text-primary transition-colors">
                          {result.title}
                        </p>
                        <p className="text-sm font-semibold text-primary">
                          {result.price}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t">
              <Button onClick={handleSearch} variant="outline" size="sm" className="gap-2 w-full">
                <RefreshCw className="w-4 h-4" />
                再検索
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
