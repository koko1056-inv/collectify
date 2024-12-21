import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OfficialGoodsEditFormProps {
  editedArtist: string;
  editedAnime: string;
  setEditedArtist: (value: string) => void;
  setEditedAnime: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function OfficialGoodsEditForm({
  editedArtist,
  editedAnime,
  setEditedArtist,
  setEditedAnime,
  onSave,
  onCancel,
}: OfficialGoodsEditFormProps) {
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

  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-medium mb-1 block">アーティスト</label>
        <Select
          value={editedArtist}
          onValueChange={setEditedArtist}
        >
          <SelectTrigger>
            <SelectValue placeholder="アーティストを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">その他（カスタム）</SelectItem>
            {artistList.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {editedArtist === "custom" && (
          <Input
            value={editedArtist}
            onChange={(e) => setEditedArtist(e.target.value)}
            placeholder="アーティスト名を入力"
            className="mt-2"
          />
        )}
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">アニメ</label>
        <Select
          value={editedAnime}
          onValueChange={setEditedAnime}
        >
          <SelectTrigger>
            <SelectValue placeholder="アニメを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">その他（カスタム）</SelectItem>
            {ipList.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {editedAnime === "custom" && (
          <Input
            value={editedAnime}
            onChange={(e) => setEditedAnime(e.target.value)}
            placeholder="アニメ名を入力"
            className="mt-2"
          />
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} className="flex items-center gap-1">
          <Check className="h-4 w-4" />
          保存
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="flex items-center gap-1">
          <X className="h-4 w-4" />
          キャンセル
        </Button>
      </div>
    </div>
  );
}