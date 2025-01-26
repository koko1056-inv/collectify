import { Input } from "@/components/ui/input";
import { TagInput } from "../TagInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ItemDetailsSectionProps {
  formData: {
    title: string;
    description: string;
    anime: string;
    artist: string;
  };
  setFormData: (data: any) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}

export function ItemDetailsSection({
  formData,
  setFormData,
  selectedTags,
  setSelectedTags,
}: ItemDetailsSectionProps) {
  const [animeOptions, setAnimeOptions] = useState<string[]>(["ちいかわ", "その他"]);
  const [artistOptions, setArtistOptions] = useState<string[]>(["ミセスグリーンアップル", "その他"]);
  const [newAnime, setNewAnime] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [showAnimeDialog, setShowAnimeDialog] = useState(false);
  const [showArtistDialog, setShowArtistDialog] = useState(false);

  const handleAddAnime = () => {
    if (newAnime && !animeOptions.includes(newAnime)) {
      setAnimeOptions([...animeOptions.filter(a => a !== "その他"), newAnime, "その他"]);
      setFormData({ ...formData, anime: newAnime });
      setNewAnime("");
      setShowAnimeDialog(false);
    }
  };

  const handleAddArtist = () => {
    if (newArtist && !artistOptions.includes(newArtist)) {
      setArtistOptions([...artistOptions.filter(a => a !== "その他"), newArtist, "その他"]);
      setFormData({ ...formData, artist: newArtist });
      setNewArtist("");
      setShowArtistDialog(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          タイトル
        </label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) =>
            setFormData({ ...formData, title: e.target.value })
          }
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">アニメ</label>
        <div className="flex gap-2">
          <Select
            value={formData.anime}
            onValueChange={(value) => {
              if (value === "その他") {
                setShowAnimeDialog(true);
              } else {
                setFormData({ ...formData, anime: value });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="アニメを選択" />
            </SelectTrigger>
            <SelectContent>
              {animeOptions.map((anime) => (
                <SelectItem key={anime} value={anime}>
                  {anime}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">アーティスト</label>
        <div className="flex gap-2">
          <Select
            value={formData.artist}
            onValueChange={(value) => {
              if (value === "その他") {
                setShowArtistDialog(true);
              } else {
                setFormData({ ...formData, artist: value });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="アーティストを選択" />
            </SelectTrigger>
            <SelectContent>
              {artistOptions.map((artist) => (
                <SelectItem key={artist} value={artist}>
                  {artist}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          説明
        </label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <TagInput
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
      />

      <Dialog open={showAnimeDialog} onOpenChange={setShowAnimeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいアニメを追加</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={newAnime}
              onChange={(e) => setNewAnime(e.target.value)}
              placeholder="アニメ名を入力"
            />
            <Button onClick={handleAddAnime}>
              <Plus className="h-4 w-4 mr-2" />
              追加
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showArtistDialog} onOpenChange={setShowArtistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいアーティストを追加</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={newArtist}
              onChange={(e) => setNewArtist(e.target.value)}
              placeholder="アーティスト名を入力"
            />
            <Button onClick={handleAddArtist}>
              <Plus className="h-4 w-4 mr-2" />
              追加
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}