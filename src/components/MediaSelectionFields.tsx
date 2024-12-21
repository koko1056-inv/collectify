import { Input } from "@/components/ui/input";
import { MediaSelector } from "./filter/MediaSelector";

interface MediaSelectionFieldsProps {
  formData: {
    artist: string;
    anime: string;
  };
  customArtist: string;
  customAnime: string;
  onFormDataChange: (key: "artist" | "anime", value: string) => void;
  onCustomArtistChange: (value: string) => void;
  onCustomAnimeChange: (value: string) => void;
  artists?: string[];
  animes?: string[];
}

export function MediaSelectionFields({
  formData,
  customArtist,
  customAnime,
  onFormDataChange,
  onCustomArtistChange,
  onCustomAnimeChange,
  artists = [],
  animes = [],
}: MediaSelectionFieldsProps) {
  const mediaOptions = [
    {
      type: "artist",
      label: "アーティスト",
      items: artists
    },
    {
      type: "anime",
      label: "アニメ",
      items: animes
    }
  ];

  const handleMediaSelect = (value: string) => {
    if (value === "all") {
      onFormDataChange("artist", "");
      onFormDataChange("anime", "");
      return;
    }

    if (value.startsWith("ip:")) {
      const ipName = value.replace("ip:", "");
      onFormDataChange("anime", ipName);
      onFormDataChange("artist", "");
      return;
    }

    if (value.startsWith("custom:")) {
      const customValue = value.replace("custom:", "");
      if (formData.artist) {
        onFormDataChange("artist", "custom");
        onCustomArtistChange(customValue);
      } else {
        onFormDataChange("anime", "custom");
        onCustomAnimeChange(customValue);
      }
      return;
    }

    const [type, name] = value.split(":");
    if (type === "artist") {
      onFormDataChange("artist", name);
      onFormDataChange("anime", "");
    } else {
      onFormDataChange("anime", name);
      onFormDataChange("artist", "");
    }
  };

  const getCurrentValue = () => {
    if (formData.artist) return `artist:${formData.artist}`;
    if (formData.anime) return `ip:${formData.anime}`;
    return "all";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">
          アニメ/アーティスト
        </label>
        <MediaSelector
          value={getCurrentValue()}
          onValueChange={handleMediaSelect}
          ipList={animes}
          mediaOptions={mediaOptions}
        />
      </div>
      {formData.artist === "custom" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            カスタムアーティスト名
          </label>
          <Input
            placeholder="アーティスト名を入力"
            value={customArtist}
            onChange={(e) => onCustomArtistChange(e.target.value)}
          />
        </div>
      )}
      {formData.anime === "custom" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            カスタムアニメ名
          </label>
          <Input
            placeholder="アニメ名を入力"
            value={customAnime}
            onChange={(e) => onCustomAnimeChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}