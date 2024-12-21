import React from "react";
import { Button } from "@/components/ui/button";
import { Tag } from "@/types";
import { TagFilter } from "./TagFilter";
import { SearchBar } from "./SearchBar";
import { MediaSelector } from "./filter/MediaSelector";

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
      onArtistSelect(null);
      onAnimeSelect(null);
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
          <MediaSelector
            value={getCurrentValue()}
            onValueChange={handleMediaSelect}
            ipList={ipList}
            mediaOptions={mediaOptions}
          />
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
    </div>
  );
}