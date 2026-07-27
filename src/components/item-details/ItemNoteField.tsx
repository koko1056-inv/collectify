
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";

interface ItemNoteFieldProps {
  isEditing: boolean;
  note: string | null | undefined;
  onChange: (value: string) => void;
  memories?: any[]; // 新規追加
}

export function ItemNoteField({
  isEditing,
  note,
  onChange,
  memories = [],
}: ItemNoteFieldProps) {
  const { t } = useLanguage();
  const { formatNumericDate } = useDateFormat();
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
        <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
          {note || t("itemDetails.common.notSet")}
        </p>
      )}

      {/* ▼ メモ欄の下に思い出一覧 */}
      {memories.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="font-medium text-sm text-gray-800 mb-1">{t("itemDetails.common.memories")}</h4>
          {memories.map((memory) => (
            <div key={memory.id} className="border rounded-lg p-2 bg-gray-50">
              {memory.image_url && (
                <img
                  src={memory.image_url}
                  alt={t("itemDetails.memories.imageAlt")}
                  className="w-full rounded mb-2"
                />
              )}
              {memory.comment && (
                <p className="text-xs text-gray-700">{memory.comment}</p>
              )}
              <p className="text-[10px] text-gray-500 mt-1">
                {formatNumericDate(memory.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
