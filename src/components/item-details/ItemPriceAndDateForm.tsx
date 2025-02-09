
import { Input } from "@/components/ui/input";

interface ItemPriceAndDateFormProps {
  isEditing: boolean;
  editedData: {
    price: string;
    purchase_date?: string;
    purchase_price?: string;
    quantity: number;
    release_date?: string;
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
              value={editedData.release_date}
              onChange={(e) =>
                setEditedData((prev: any) => ({ ...prev, release_date: e.target.value }))
              }
            />
          ) : (
            <p className="text-sm text-gray-600">
              {editedData.release_date || "未設定"}
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
                setEditedData((prev: any) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))
              }
            />
          ) : (
            <p className="text-sm text-gray-600">{editedData.quantity}</p>
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
            value={editedData.purchase_date || ""}
            onChange={(e) =>
              setEditedData((prev: any) => ({ ...prev, purchase_date: e.target.value }))
            }
          />
        ) : (
          <p className="text-sm text-gray-600">
            {editedData.purchase_date || "未設定"}
          </p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium">購入金額</label>
        {isEditing ? (
          <Input
            type="text"
            value={editedData.purchase_price || ""}
            onChange={(e) =>
              setEditedData((prev: any) => ({ ...prev, purchase_price: e.target.value }))
            }
            placeholder="¥0"
          />
        ) : (
          <p className="text-sm text-gray-600">
            {editedData.purchase_price ? `¥${editedData.purchase_price}` : "未設定"}
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
              setEditedData((prev: any) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))
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
