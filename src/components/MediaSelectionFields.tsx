import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { SelectionDialog } from "./filter/SelectionDialog";
import { useState } from "react";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const animes = [
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

  const handleItemSelect = (item: string) => {
    if (artists.includes(item)) {
      onFormDataChange("artist", item);
      onFormDataChange("anime", "");
    } else {
      onFormDataChange("anime", item);
      onFormDataChange("artist", "");
    }
    setIsDialogOpen(false);
  };

  const getDisplayText = () => {
    if (formData.artist) return formData.artist;
    if (formData.anime) return formData.anime;
    return "アニメ/アーティストから選択";
  };

  return (
    <div className="w-full">
      <Button
        variant="outline"
        onClick={() => setIsDialogOpen(true)}
        className="w-full justify-between font-normal"
      >
        <span>{getDisplayText()}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>

      <SelectionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSelect={handleItemSelect}
        ipList={ipList}
        artists={artists}
        animes={animes}
      />
    </div>
  );
}