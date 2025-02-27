
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TitleSectionProps {
  title: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function TitleSection({
  title,
  onChange,
}: TitleSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="title">タイトル</Label>
      <Input
        id="title"
        name="title"
        value={title}
        onChange={onChange}
        placeholder="アイテム名を入力"
        required
      />
    </div>
  );
}
