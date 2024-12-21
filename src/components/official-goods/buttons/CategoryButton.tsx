import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { SelectionDialog } from "@/components/filter/SelectionDialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface CategoryButtonProps {
  itemId: string;
  itemTitle: string;
  onAnimeSelect?: (anime: string | null) => void;
  onArtistSelect?: (artist: string | null) => void;
}

export function CategoryButton({ 
  itemId, 
  itemTitle,
  onAnimeSelect,
  onArtistSelect
}: CategoryButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const ipList = [
    "鬼滅の刃",
    "呪術廻戦",
    "SPY×FAMILY",
    "チェンソーマン",
    "推しの子",
    "ブルーロック",
    "葬送のフリーレン",
    "ワンピース",
    "進撃の巨人"
  ];

  const handleSelect = async (item: string) => {
    try {
      const { error } = await supabase
        .from('official_items')
        .update({ anime: item })
        .eq('id', itemId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["official-items"] });

      // Update the filter in the index page
      if (onAnimeSelect) {
        onAnimeSelect(item);
      }
      if (onArtistSelect) {
        onArtistSelect(null);
      }

      toast({
        title: "カテゴリを更新しました",
        description: `${itemTitle}のカテゴリを${item}に設定しました。`,
      });
    } catch (error) {
      console.error("Error updating category:", error);
      toast({
        title: "エラー",
        description: "カテゴリの更新に失敗しました。",
        variant: "destructive",
      });
    }
    setIsDialogOpen(false);
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="icon"
        onClick={() => setIsDialogOpen(true)}
        className="border-gray-200 hover:bg-gray-50"
      >
        <Edit2 className="h-4 w-4" />
      </Button>

      <SelectionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSelect={handleSelect}
        ipList={ipList}
        artists={[]}
        animes={[]}
        mode="category"
        onAnimeSelect={onAnimeSelect}
        onArtistSelect={onArtistSelect}
      />
    </>
  );
}