import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

interface ItemDetailsFormProps {
  isEditing: boolean;
  editedData: {
    title: string;
    artist: string;
    anime: string;
    price: string;
    releaseDate: string;
    description: string;
  };
  setEditedData: (data: any) => void;
}

export function ItemDetailsForm({ isEditing, editedData, setEditedData }: ItemDetailsFormProps) {
  if (!isEditing) {
    return (
      <>
        {editedData.artist && (
          <div>
            <span className="font-semibold">アーティスト：</span>
            <span>{editedData.artist}</span>
          </div>
        )}
        {editedData.anime && (
          <div>
            <span className="font-semibold">アニメ/キャラクター：</span>
            <span>{editedData.anime}</span>
          </div>
        )}
        {editedData.price && (
          <div>
            <span className="font-semibold">価格：</span>
            <span>{editedData.price}</span>
          </div>
        )}
        {editedData.releaseDate && (
          <div>
            <span className="font-semibold">発売日：</span>
            <span>{editedData.releaseDate}</span>
          </div>
        )}
        {editedData.description && (
          <div>
            <span className="font-semibold">詳細：</span>
            <span>{editedData.description}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">アーティスト</label>
        <Input
          value={editedData.artist}
          onChange={(e) =>
            setEditedData({ ...editedData, artist: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">アニメ/キャラクター</label>
        <Input
          value={editedData.anime}
          onChange={(e) =>
            setEditedData({ ...editedData, anime: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">価格</label>
        <Input
          value={editedData.price}
          onChange={(e) =>
            setEditedData({ ...editedData, price: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">発売日</label>
        <Input
          type="date"
          value={editedData.releaseDate}
          onChange={(e) =>
            setEditedData({ ...editedData, releaseDate: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">詳細</label>
        <Textarea
          value={editedData.description}
          onChange={(e) =>
            setEditedData({ ...editedData, description: e.target.value })
          }
        />
      </div>
    </div>
  );
}