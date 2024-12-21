import React from "react";
import { Button } from "@/components/ui/button";
import { Tag } from "@/types";
import { TagFilter } from "./TagFilter";
import { SearchBar } from "./SearchBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTag: string | null;
  onTagSelect: (tagName: string | null) => void;
  tags: Tag[];
  selectedArtist: string | null;
  onArtistSelect: (artist: string | null) => void;
  selectedAnime: string | null;
  onAnimeSelect: (anime: string | null) => void;
  artists: string[];
  animes: string[];
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagSelect,
  tags,
  selectedArtist,
  onArtistSelect,
  selectedAnime,
  onAnimeSelect,
  artists,
  animes,
}: FilterBarProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

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

  const mediaOptions = [
    { type: "artist", label: "アーティスト", items: artists },
    { type: "anime", label: "アニメ", items: animes },
  ];

  const handleMediaSelect = (value: string) => {
    if (value === "all") {
      setIsDialogOpen(true);
      return;
    }

    if (value.startsWith("ip:")) {
      const ipName = value.replace("ip:", "");
      onAnimeSelect(ipName);
      onArtistSelect(null);
      return;
    }

    const [type, name] = value.split(":");
    if (type === "artist") {
      onArtistSelect(name);
      onAnimeSelect(null);
    } else {
      onAnimeSelect(name);
      onArtistSelect(null);
    }
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleItemSelect = (item: string) => {
    if (selectedCategory === "artist") {
      onArtistSelect(item);
      onAnimeSelect(null);
    } else {
      onAnimeSelect(item);
      onArtistSelect(null);
    }
    setIsDialogOpen(false);
    setSelectedCategory(null);
  };

  const getCurrentValue = () => {
    if (selectedArtist) return `artist:${selectedArtist}`;
    if (selectedAnime) return `anime:${selectedAnime}`;
    return "all";
  };

  return (
    <div className="space-y-4">
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        selectedTag={selectedTag}
        onTagSelect={onTagSelect}
        tags={tags}
      />

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <Select
            value={getCurrentValue()}
            onValueChange={handleMediaSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="アーティスト/アニメで絞り込む" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて表示</SelectItem>
              <SelectItem value="header" className="font-semibold">
                人気IP
              </SelectItem>
              {ipList.map((item) => (
                <SelectItem key={`ip:${item}`} value={`ip:${item}`}>
                  {item}
                </SelectItem>
              ))}
              {mediaOptions.map(({ type, label, items }) => (
                <React.Fragment key={type}>
                  <SelectItem value={`${type}:header`} className="font-semibold">
                    {label}
                  </SelectItem>
                  {items.map((item) => (
                    <SelectItem key={`${type}:${item}`} value={`${type}:${item}`}>
                      {item}
                    </SelectItem>
                  ))}
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(selectedArtist || selectedAnime) && (
          <Button
            variant="outline"
            onClick={() => {
              onArtistSelect(null);
              onAnimeSelect(null);
            }}
            className="shrink-0"
          >
            絞り込みをクリア
          </Button>
        )}
      </div>

      <TagFilter
        selectedTag={selectedTag}
        onTagSelect={onTagSelect}
        tags={tags}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>カテゴリーを選択</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">人気IP</h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {ipList.map((ip) => (
                    <Button
                      key={ip}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleItemSelect(ip)}
                    >
                      {ip}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">アーティスト</h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {artists.map((artist) => (
                    <Button
                      key={artist}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleItemSelect(artist)}
                    >
                      {artist}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">アニメ</h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {animes.map((anime) => (
                    <Button
                      key={anime}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleItemSelect(anime)}
                    >
                      {anime}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}