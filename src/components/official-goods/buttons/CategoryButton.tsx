import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface CategoryButtonProps {
  itemId: string;
  itemTitle: string;
  currentArtist?: string | null;
  currentAnime?: string | null;
  onAnimeSelect?: (anime: string | null) => void;
  onArtistSelect?: (artist: string | null) => void;
}

export function CategoryButton({ 
  itemId, 
  itemTitle,
  currentArtist,
  currentAnime,
  onAnimeSelect,
  onArtistSelect
}: CategoryButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const artistList = [
    "YOASOBI",
    "Mrs. GREEN APPLE",
    "Official髭男dism",
    "King Gnu",
    "Ado"
  ];

  const handleSelect = async (type: 'anime' | 'artist', value: string | null) => {
    try {
      const updates = {
        [type]: value
      };

      const { error } = await supabase
        .from('official_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      if (type === 'anime' && onAnimeSelect) {
        onAnimeSelect(value);
      } else if (type === 'artist' && onArtistSelect) {
        onArtistSelect(value);
      }

      queryClient.invalidateQueries({ queryKey: ['official-items'] });

      toast({
        title: "更新完了",
        description: `${itemTitle}の${type === 'anime' ? 'アニメ' : 'アーティスト'}を更新しました。`,
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "エラー",
        description: "カテゴリの更新に失敗しました。",
        variant: "destructive",
      });
    }
    setIsDialogOpen(false);
  };

  const filteredIpList = ipList.filter(ip =>
    ip.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredArtistList = artistList.filter(artist =>
    artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              カテゴリを選択
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 pb-0">
            <Input
              placeholder="検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
          </div>
          <ScrollArea className="h-[50vh] pr-4">
            <div className="grid grid-cols-2 gap-2 p-4">
              <div className="col-span-2">
                <h3 className="font-semibold mb-2">アニメ</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={currentAnime === null ? "default" : "outline"}
                    className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                    onClick={() => handleSelect('anime', null)}
                  >
                    クリア
                  </Button>
                  {filteredIpList.map((ip) => (
                    <Button
                      key={ip}
                      variant={currentAnime === ip ? "default" : "outline"}
                      className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                      onClick={() => handleSelect('anime', ip)}
                    >
                      {ip}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 mt-4">
                <h3 className="font-semibold mb-2">アーティスト</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={currentArtist === null ? "default" : "outline"}
                    className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                    onClick={() => handleSelect('artist', null)}
                  >
                    クリア
                  </Button>
                  {filteredArtistList.map((artist) => (
                    <Button
                      key={artist}
                      variant={currentArtist === artist ? "default" : "outline"}
                      className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                      onClick={() => handleSelect('artist', artist)}
                    >
                      {artist}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}