
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Edit, X } from "lucide-react";

interface ProfileBioProps {
  bio: string;
  xUsername: string;
  isEditing: boolean;
  saving: boolean;
  onBioChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onXUsernameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isOwnProfile?: boolean;
}

export function ProfileBio({
  bio,
  xUsername,
  isEditing,
  saving,
  onBioChange,
  onXUsernameChange,
  onEdit,
  onCancel,
  onSubmit,
  isOwnProfile = false,
}: ProfileBioProps) {
  if (!isOwnProfile && !bio && !xUsername) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm space-y-4">
      {isEditing ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bio">プロフィール</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={onBioChange}
              placeholder="好きなアーティスト/キャラクター、推しポイント、収集歴などを自由に書いてください"
              className="min-h-[120px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="xUsername">Xアカウント</Label>
            <Input
              id="xUsername"
              type="text"
              value={xUsername}
              onChange={onXUsernameChange}
              placeholder="Xのユーザー名（@なし）"
            />
          </div>
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
        <div className="prose prose-sm max-w-none text-center space-y-2">
          {bio && <p className="whitespace-pre-wrap">{bio}</p>}
          {xUsername && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">X:</span>
              <a 
                href={`https://x.com/${xUsername}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 text-sm font-medium"
              >
                @{xUsername}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
