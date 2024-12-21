import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label htmlFor="artist" className="text-sm font-medium">
          アーティスト
        </label>
        <Select
          value={formData.artist}
          onValueChange={(value) => onFormDataChange("artist", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="アーティストを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">その他（カスタム）</SelectItem>
            <SelectItem value="YOASOBI">YOASOBI</SelectItem>
            <SelectItem value="Mrs. GREEN APPLE">Mrs. GREEN APPLE</SelectItem>
            <SelectItem value="Official髭男dism">Official髭男dism</SelectItem>
            <SelectItem value="King Gnu">King Gnu</SelectItem>
            <SelectItem value="Ado">Ado</SelectItem>
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
      </div>
      <div className="space-y-2">
        <label htmlFor="anime" className="text-sm font-medium">
          アニメ
        </label>
        <Select
          value={formData.anime}
          onValueChange={(value) => onFormDataChange("anime", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="アニメを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">その他（カスタム）</SelectItem>
            <SelectItem value="鬼滅の刃">鬼滅の刃</SelectItem>
            <SelectItem value="呪術廻戦">呪術廻戦</SelectItem>
            <SelectItem value="SPY×FAMILY">SPY×FAMILY</SelectItem>
            <SelectItem value="チェンソーマン">チェンソーマン</SelectItem>
            <SelectItem value="推しの子">推しの子</SelectItem>
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
      </div>
    </div>
  );
}