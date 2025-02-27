
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ItemTypeSectionProps {
  itemType: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function ItemTypeSection({
  itemType,
  onChange,
}: ItemTypeSectionProps) {
  const handleItemTypeChange = (value: string) => {
    const changeEvent = {
      target: { name: 'item_type', value }
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(changeEvent);
  };

  return (
    <div className="space-y-2">
      <Label>商品タイプ</Label>
      <Select
        value={itemType || "official"}
        onValueChange={handleItemTypeChange}
      >
        <SelectTrigger className="w-full bg-white">
          <SelectValue placeholder="商品タイプを選択" />
        </SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="official" className="hover:bg-gray-100">公式グッズ</SelectItem>
          <SelectItem value="original" className="hover:bg-gray-100">オリジナルグッズ</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
