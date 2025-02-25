import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileBio } from "./ProfileBio";
import { ProfileImageUpload } from "./ProfileImageUpload";
import { CategoryTagSelect } from "@/components/tag/CategoryTagSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

interface ProfileCardProps {
  onShare: () => void;
  setUsername: (username: string) => void;
  userId?: string;
}

export function ProfileCard({
  onShare,
  setUsername,
  userId
}: ProfileCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [username_, setUsername_] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [favoriteTags, setFavoriteTags] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const isOwnProfile = !userId || user?.id === userId;
  const effectiveUserId = userId || user?.id;

  useEffect(() => {
    if (!effectiveUserId) return;
    const fetchProfile = async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", effectiveUserId)
        .single();

      if (error) {
        toast({
          variant: "destructive",
          title: "エラー",
          description: "プロフィールの取得に失敗しました"
        });
        return;
      }

      setBio(profile.bio || "");
      setUsername_(profile.username || "");
      setUsername(profile.username || "");
      setAvatarUrl(profile.avatar_url);
      setPreviewUrl(profile.avatar_url);
      setFavoriteTags(profile.favorite_tags || []);
      setLoading(false);
    };
    fetchProfile();
  }, [effectiveUserId, toast, setUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isOwnProfile) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ bio })
      .eq("id", user.id);

    setSaving(false);
    setIsEditing(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "プロフィールの更新に失敗しました"
      });
      return;
    }

    toast({
      title: "更新完了",
      description: "プロフィールを更新しました"
    });
  };

  const handleTagChange = async (value: string | null) => {
    if (!value || !user || !isOwnProfile) return;
    
    const newTags = [...favoriteTags];
    if (!newTags.includes(value)) {
      newTags.push(value);
      setFavoriteTags(newTags);

      const { error } = await supabase
        .from("profiles")
        .update({ favorite_tags: newTags })
        .eq("id", user.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "エラー",
          description: "タグの更新に失敗しました"
        });
        return;
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!user || !isOwnProfile) return;
    
    const newTags = favoriteTags.filter(tag => tag !== tagToRemove);
    setFavoriteTags(newTags);

    const { error } = await supabase
      .from("profiles")
      .update({ favorite_tags: newTags })
      .eq("id", user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "タグの削除に失敗しました"
      });
      return;
    }
  };

  const handleImageChange = async (file: File | null) => {
    if (!file || !user || !isOwnProfile) return;
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      const {
        error: uploadError
      } = await supabase.storage.from('profile_images').upload(filePath, file);
      if (uploadError) {
        throw uploadError;
      }
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('profile_images').getPublicUrl(filePath);
      const {
        error: updateError
      } = await supabase.from('profiles').update({
        avatar_url: publicUrl
      }).eq('id', user.id);
      if (updateError) {
        throw updateError;
      }
      setAvatarUrl(publicUrl);
      toast({
        title: "画像アップロード完了",
        description: "プロフィール画像を更新しました"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "画像のアップロードに失敗しました"
      });
      console.error('Error uploading image:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'bg-white' : 'bg-white p-6 rounded-lg shadow'}`}>
      <div className="flex flex-col items-center mb-4">
        <div className="w-24 h-24 mb-4 py-[26px]">
          {isOwnProfile ? (
            <ProfileImageUpload
              onImageChange={handleImageChange}
              previewUrl={previewUrl}
              setPreviewUrl={setPreviewUrl}
              userId={effectiveUserId}
            />
          ) : (
            <img
              src={avatarUrl || "/placeholder.svg"}
              alt={username_}
              className="w-24 h-24 rounded-full object-cover"
            />
          )}
        </div>
        <ProfileHeader username={username_} onShare={onShare} isOwnProfile={isOwnProfile} />
      </div>

      <ProfileStats userId={effectiveUserId} />

      {isOwnProfile && (
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setIsEditing(true)}
            className="text-center py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 text-sm font-bold"
          >
            プロフィールを編集
          </button>
        </div>
      )}

      <div className="mt-4">
        <ProfileBio
          bio={bio}
          isEditing={isEditing}
          onBioChange={e => setBio(e.target.value)}
          onEdit={() => setIsEditing(true)}
          onCancel={() => setIsEditing(false)}
          onSubmit={handleSubmit}
          saving={saving}
          isOwnProfile={isOwnProfile}
        />
      </div>

      <div className="mt-6 space-y-4">
        <div className="font-medium">推しコンテンツ</div>
        {isOwnProfile ? (
          <div className="space-y-4">
            <CategoryTagSelect
              category="character"
              label="キャラクター"
              value={null}
              onChange={handleTagChange}
            />
            <div className="flex flex-wrap gap-2">
              {favoriteTags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full"
                >
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {favoriteTags.map((tag) => (
              <div
                key={tag}
                className="bg-primary/10 text-primary px-3 py-1 rounded-full"
              >
                {tag}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
