
import { Input } from "@/components/ui/input";

interface ItemPriceAndDateFormProps {
  isEditing: boolean;
  editedData: {
    price: string;
    purchaseDate: string;
    purchasePrice: string;
    quantity: number;
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
  if (!isUserItem) {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">登録日</label>
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

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">購入日</label>
        {isEditing ? (
          <Input
            type="date"
            value={editedData.purchaseDate || ""}
            onChange={(e) =>
              setEditedData({ ...editedData, purchaseDate: e.target.value })
            }
          />
        ) : (
          <p className="text-sm text-gray-600">
            {editedData.purchaseDate || "未設定"}
          </p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium">購入金額</label>
        {isEditing ? (
          <Input
            type="text"
            value={editedData.purchasePrice || ""}
            onChange={(e) =>
              setEditedData({ ...editedData, purchasePrice: e.target.value })
            }
            placeholder="¥0"
          />
        ) : (
          <p className="text-sm text-gray-600">
            {editedData.purchasePrice ? `¥${editedData.purchasePrice}` : "未設定"}
          </p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium">保有数</label>
        {isEditing ? (
          <Input
            type="number"
            min="1"
            value={editedData.quantity}
            onChange={(e) =>
              setEditedData({ ...editedData, quantity: parseInt(e.target.value) || 1 })
            }
          />
        ) : (
          <p className="text-sm text-gray-600">
            {editedData.quantity}
          </p>
        )}
      </div>
    </div>
  );
}
