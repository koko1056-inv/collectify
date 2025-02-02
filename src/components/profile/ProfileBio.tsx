import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Edit, X } from "lucide-react";

interface ProfileBioProps {
  bio: string;
  isEditing: boolean;
  saving: boolean;
  onBioChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isOwnProfile?: boolean;
}

export function ProfileBio({
  bio,
  isEditing,
  saving,
  onBioChange,
  onEdit,
  onCancel,
  onSubmit,
  isOwnProfile = false,
}: ProfileBioProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">自己紹介</h2>
        {!isEditing && isOwnProfile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            編集
          </Button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <Textarea
            value={bio}
            onChange={onBioChange}
            placeholder="好きなアーティスト/キャラクター、推しポイント、収集歴などを自由に書いてください"
            className="min-h-[120px]"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              キャンセル
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-2">
              <Check className="h-4 w-4" />
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap">{bio || "自己紹介文が未設定です"}</p>
        </div>
      )}
    </div>
  );
}