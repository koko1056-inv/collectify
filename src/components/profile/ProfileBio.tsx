import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface ProfileBioProps {
  bio: string;
  isEditing?: boolean;
  onBioChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onSubmit?: (e: React.FormEvent) => Promise<void>;
  saving?: boolean;
}

export function ProfileBio({ 
  bio,
  isEditing = false,
  onBioChange,
  onEdit,
  onCancel,
  onSubmit,
  saving = false
}: ProfileBioProps) {
  const [localBio, setLocalBio] = useState(bio);

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalBio(e.target.value);
    onBioChange?.(e);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      await onSubmit(e);
    }
  };

  return (
    <div className="space-y-4">
      {isEditing ? (
        <form onSubmit={handleSubmit}>
          <Textarea
            value={localBio}
            onChange={handleBioChange}
            placeholder="自己紹介を入力..."
            className="min-h-[100px]"
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              キャンセル
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <p>{bio || "自己紹介がありません。"}</p>
          <Button variant="outline" onClick={onEdit}>
            編集
          </Button>
        </div>
      )}
    </div>
  );
}
