
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ItemNoteFieldProps {
  isEditing: boolean;
  note: string | null | undefined;
  onChange: (value: string) => void;
  memories?: any[];
}

export function ItemNoteField({
  isEditing,
  note,
  onChange,
  memories = [],
}: ItemNoteFieldProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">メモ</Label>
        {isEditing ? (
          <Textarea
            value={note || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="このグッズに関連した自分用メモを記入"
            className="mt-2 min-h-[100px]"
          />
        ) : (
          <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
            {note || "未設定"}
          </p>
        )}
      </div>

      {memories.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-sm mb-3">思い出</h4>
          <ScrollArea className="h-[200px] rounded-md border p-4">
            <div className="space-y-4">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="p-3 bg-gray-50 rounded-lg"
                >
                  {memory.image_url && (
                    <img
                      src={memory.image_url}
                      alt="思い出の画像"
                      className="w-full h-32 object-cover rounded-md mb-2"
                    />
                  )}
                  {memory.comment && (
                    <p className="text-sm text-gray-700">{memory.comment}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(memory.created_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
