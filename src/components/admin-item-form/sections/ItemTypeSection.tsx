
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

interface ItemTypeSectionProps {
  itemType: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function ItemTypeSection({
  itemType,
  onChange,
}: ItemTypeSectionProps) {
  const { t } = useLanguage();

  const handleItemTypeChange = (value: string) => {
    const changeEvent = {
      target: { name: 'item_type', value }
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(changeEvent);
  };

  return (
    <div className="space-y-2">
      <Label>{t("misc.itemForm.itemTypeLabel")}</Label>
      <Select
        value={itemType || "official"}
        onValueChange={handleItemTypeChange}
      >
        <SelectTrigger className="w-full bg-white">
          <SelectValue placeholder={t("misc.itemForm.itemTypePlaceholder")} />
        </SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="official" className="hover:bg-gray-100">{t("misc.itemForm.itemTypeOfficial")}</SelectItem>
          <SelectItem value="original" className="hover:bg-gray-100">{t("misc.itemForm.itemTypeOriginal")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
