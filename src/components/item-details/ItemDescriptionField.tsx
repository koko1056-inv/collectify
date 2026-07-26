import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";

interface ItemDescriptionFieldProps {
  isEditing: boolean;
  description: string;
  onChange: (value: string) => void;
}

export function ItemDescriptionField({ 
  isEditing, 
  description,
  onChange,
}: ItemDescriptionFieldProps) {
  const { t } = useLanguage();
  return (
    <div>
      <label className="text-sm font-medium">{t("itemDetails.common.description")}</label>
      {isEditing ? (
        <Textarea
          value={description || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("itemDetails.fields.descriptionPlaceholder")}
          className="mt-2"
        />
      ) : (
        <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
          {description || t("itemDetails.common.notSet")}
        </p>
      )}
    </div>
  );
}