
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";

interface ItemNoteFieldProps {
  isEditing: boolean;
  note: string | null | undefined;
  onChange: (value: string) => void;
}

export function ItemNoteField({
  isEditing,
  note,
  onChange,
}: ItemNoteFieldProps) {
  const { t } = useLanguage();
  return (
    <div>
      <label className="text-sm font-medium">{t("itemDetails.common.note")}</label>
      {isEditing ? (
        <Textarea
          value={note || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("itemDetails.fields.notePlaceholder")}
          className="mt-2"
        />
      ) : (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">
          {note || t("itemDetails.common.notSet")}
        </p>
      )}
    </div>
  );
}
