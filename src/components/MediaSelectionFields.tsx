import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaSelectionDialog } from "./filter/MediaSelectionDialog";

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
}

export function MediaSelectionFields({
  formData,
  customArtist,
  customAnime,
  onFormDataChange,
  onCustomArtistChange,
  onCustomAnimeChange,
}: MediaSelectionFieldsProps) {
  const [isArtistDialogOpen, setIsArtistDialogOpen] = useState(false);
  const [isAnimeDialogOpen, setIsAnimeDialogOpen] = useState(false);
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

  const mediaOptions = [
    {
      type: "artist",
      label: "アーティスト",
      items: [
        "YOASOBI",
        "Mrs. GREEN APPLE",
        "Official髭男dism",
        "King Gnu",
        "Ado",
        "米津玄師",
        "LiSA",
        "藤井 風",
        "Vaundy",
        "ずっと真夜中でいいのに。"
      ]
    }
  ];

  const handleArtistSelect = (value: string) => {
    if (value.startsWith("artist:")) {
      const artistName = value.replace("artist:", "");
      onFormDataChange("artist", artistName);
    } else if (value === "custom") {
      onFormDataChange("artist", "custom");
    }
    setIsArtistDialogOpen(false);
  };

  const handleAnimeSelect = (value: string) => {
    if (value.startsWith("ip:")) {
      const animeName = value.replace("ip:", "");
      onFormDataChange("anime", animeName);
    } else if (value === "custom") {
      onFormDataChange("anime", "custom");
    }
    setIsAnimeDialogOpen(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label htmlFor="artist" className="text-sm font-medium">
          アーティスト
        </label>
        <Select
          value={formData.artist}
          onValueChange={(value) => {
            if (value === "select") {
              setIsArtistDialogOpen(true);
            } else {
              onFormDataChange("artist", value);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="アーティストを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="select">アーティストから選択</SelectItem>
            <SelectItem value="custom">その他（カスタム）</SelectItem>
          </SelectContent>
        </Select>
        {formData.artist === "custom" && (
          <Input
            placeholder="アーティスト名を入力"
            value={customArtist}
            onChange={(e) => onCustomArtistChange(e.target.value)}
            className="mt-2"
          />
        )}
        <MediaSelectionDialog
          isOpen={isArtistDialogOpen}
          onClose={() => setIsArtistDialogOpen(false)}
          onSelect={handleArtistSelect}
          currentValue={`artist:${formData.artist}`}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          ipList={[]}
          mediaOptions={mediaOptions}
          showAllOption={false}
          title="アーティストを選択"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="anime" className="text-sm font-medium">
          アニメ
        </label>
        <Select
          value={formData.anime}
          onValueChange={(value) => {
            if (value === "select") {
              setIsAnimeDialogOpen(true);
            } else {
              onFormDataChange("anime", value);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="アニメを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="select">アニメから選択</SelectItem>
            <SelectItem value="custom">その他（カスタム）</SelectItem>
          </SelectContent>
        </Select>
        {formData.anime === "custom" && (
          <Input
            placeholder="アニメ名を入力"
            value={customAnime}
            onChange={(e) => onCustomAnimeChange(e.target.value)}
            className="mt-2"
          />
        )}
        <MediaSelectionDialog
          isOpen={isAnimeDialogOpen}
          onClose={() => setIsAnimeDialogOpen(false)}
          onSelect={handleAnimeSelect}
          currentValue={`ip:${formData.anime}`}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          ipList={ipList}
          mediaOptions={[]}
          showAllOption={false}
          title="アニメを選択"
        />
      </div>
    </div>
  );
}