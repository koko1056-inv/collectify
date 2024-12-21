import { Button } from "@/components/ui/button";
import { Edit2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const [searchQuery, setSearchQuery] = useState("");
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

  const artists = [
    "YOASOBI",
    "Mrs. GREEN APPLE",
    "Official髭男dism",
    "King Gnu",
    "Ado"
  ];

  const filteredIpList = ipList.filter(ip =>
    ip.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredArtists = artists.filter(artist =>
    artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = async (type: 'anime' | 'artist', value: string | null) => {
    try {
      const updateData: { anime?: string | null; artist?: string | null } = {};
      if (type === 'anime') {
        updateData.anime = value;
        updateData.artist = null;
      } else {
        updateData.artist = value;
        updateData.anime = null;
      }

      const { error } = await supabase
        .from('official_items')
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["official-items"] });
      setIsDialogOpen(false);

      if (type === 'anime' && onAnimeSelect) {
        onAnimeSelect(value);
      } else if (type === 'artist' && onArtistSelect) {
        onArtistSelect(value);
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
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
            <div className="space-y-4 p-4">
              <div>
                <h3 className="font-semibold mb-2">アニメ</h3>
                <div className="grid grid-cols-2 gap-2">
                  {searchQuery === "" && (
                    <Button
                      variant="outline"
                      className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                      onClick={() => handleSelect('anime', null)}
                    >
                      クリア
                    </Button>
                  )}
                  {filteredIpList.map((ip) => (
                    <Button
                      key={ip}
                      variant="outline"
                      className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                      onClick={() => handleSelect('anime', ip)}
                    >
                      {ip}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">アーティスト</h3>
                <div className="grid grid-cols-2 gap-2">
                  {searchQuery === "" && (
                    <Button
                      variant="outline"
                      className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                      onClick={() => handleSelect('artist', null)}
                    >
                      クリア
                    </Button>
                  )}
                  {filteredArtists.map((artist) => (
                    <Button
                      key={artist}
                      variant="outline"
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