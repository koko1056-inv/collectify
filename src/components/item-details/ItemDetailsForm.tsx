import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ItemDetailsFormProps {
  isEditing: boolean;
  editedData: {
    artist: string;
    anime: string;
    price: string;
    releaseDate: string;
    description: string;
  };
  setEditedData: (data: any) => void;
  isUserItem?: boolean;
}

export function ItemDetailsForm({ 
  isEditing, 
  editedData, 
  setEditedData,
  isUserItem = false,
}: ItemDetailsFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">アーティスト</label>
        {isEditing ? (
          <Input
            value={editedData.artist}
            onChange={(e) =>
              setEditedData({ ...editedData, artist: e.target.value })
            }
            placeholder="アーティストを入力"
          />
        ) : (
          <p className="text-sm text-gray-600">{editedData.artist || "未設定"}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">アニメ</label>
        {isEditing ? (
          <Input
            value={editedData.anime}
            onChange={(e) =>
              setEditedData({ ...editedData, anime: e.target.value })
            }
            placeholder="アニメを入力"
          />
        ) : (
          <p className="text-sm text-gray-600">{editedData.anime || "未設定"}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">{isUserItem ? "獲得価格" : "価格"}</label>
        {isEditing ? (
          <Input
            value={editedData.price}
            onChange={(e) =>
              setEditedData({ ...editedData, price: e.target.value })
            }
            placeholder={isUserItem ? "獲得価格を入力" : "価格を入力"}
          />
        ) : (
          <p className="text-sm text-gray-600">
            {editedData.price ? `¥${editedData.price}` : "未設定"}
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">発売日</label>
        {isEditing ? (
          <Input
            type="date"
            value={editedData.releaseDate}
            onChange={(e) =>
              setEditedData({ ...editedData, releaseDate: e.target.value })
            }
          />
        ) : (
          <p className="text-sm text-gray-600">
            {editedData.releaseDate || "未設定"}
          </p>
        )}
      </div>

      {!isUserItem && (
        <div>
          <label className="text-sm font-medium">説明</label>
          {isEditing ? (
            <Textarea
              value={editedData.description}
              onChange={(e) =>
                setEditedData({ ...editedData, description: e.target.value })
              }
              placeholder="説明を入力"
            />
          ) : (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {editedData.description || "未設定"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}