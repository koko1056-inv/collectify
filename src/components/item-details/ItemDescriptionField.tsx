import { Textarea } from "@/components/ui/textarea";

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
  return (
    <div>
      <label className="text-sm font-medium">説明</label>
      {isEditing ? (
        <Textarea
          value={description}
          onChange={(e) => onChange(e.target.value)}
          placeholder="説明を入力"
        />
      ) : (
        <p className="text-sm text-gray-600 whitespace-pre-wrap">
          {description || "未設定"}
        </p>
      )}
    </div>
  );
}