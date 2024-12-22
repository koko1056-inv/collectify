import { Input } from "@/components/ui/input";

interface ItemPriceAndDateFormProps {
  isEditing: boolean;
  editedData: {
    price: string;
    releaseDate: string;
  };
  setEditedData: (data: any) => void;
  isUserItem?: boolean;
}

export function ItemPriceAndDateForm({ 
  isEditing, 
  editedData, 
  setEditedData,
  isUserItem = false,
}: ItemPriceAndDateFormProps) {
  return (
    <div className="space-y-4">
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
    </div>
  );
}