
import { Textarea } from "@/components/ui/textarea";

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
  return (
    <div>
      <label className="text-sm font-medium">メモ</label>
      {isEditing ? (
        <Textarea
          value={note || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="このグッズに関連した自分用メモを記入"
          className="mt-2"
        />
      ) : (
        <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
          {note || "未設定"}
        </p>
      )}
    </div>
  );
}
