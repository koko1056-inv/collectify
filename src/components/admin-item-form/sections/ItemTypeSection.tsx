
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ItemTypeSectionProps {
  itemType: string | undefined;
  onItemTypeChange: (type: string) => void;
}

export function ItemTypeSection({
  itemType,
  onItemTypeChange,
}: ItemTypeSectionProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        商品タイプ
      </label>
      <Select
        value={itemType || "official"}
        onValueChange={onItemTypeChange}
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
