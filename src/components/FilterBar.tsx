import { Button } from "@/components/ui/button";
import { Tag } from "@/types";
import { TagFilter } from "./TagFilter";
import { SearchBar } from "./SearchBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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
            value={selectedArtist || ""}
            onValueChange={(value) => onArtistSelect(value === "" ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="アーティストで絞り込む" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">すべてのアーティスト</SelectItem>
              {artists.map((artist) => (
                <SelectItem key={artist} value={artist}>
                  {artist}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <Select
            value={selectedAnime || ""}
            onValueChange={(value) => onAnimeSelect(value === "" ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="アニメで絞り込む" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">すべてのアニメ</SelectItem>
              {animes.map((anime) => (
                <SelectItem key={anime} value={anime}>
                  {anime}
                </SelectItem>
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
    </div>
  );
}