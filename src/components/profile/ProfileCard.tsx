import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileBio } from "./ProfileBio";
import { ProfileFavorites } from "./ProfileFavorites";
import { ProfileImageUpload } from "./ProfileImageUpload";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileCardProps {
  onShare: () => void;
  setUsername: (username: string) => void;
}

export function ProfileCard({ onShare, setUsername }: ProfileCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [username_, setUsername_] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isFavoritesEditing, setIsFavoritesEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        toast({
          variant: "destructive",
          title: "エラー",
          description: "プロフィールの取得に失敗しました",
        });
        return;
      }

      setBio(profile.bio || "");
      setUsername_(profile.username || "");
      setUsername(profile.username || "");
      setAvatarUrl(profile.avatar_url);
      setLoading(false);
    };

    fetchProfile();
  }, [user, toast, setUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

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
        description: "プロフィールの更新に失敗しました",
      });
      return;
    }

    toast({
      title: "更新完了",
      description: "プロフィールを更新しました",
    });
  };

  const handleImageChange = async (file: File | null) => {
    if (!file || !user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kuji_images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('kuji_images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      toast({
        title: "画像アップロード完了",
        description: "プロフィール画像を更新しました",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "画像のアップロードに失敗しました",
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
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16">
            <ProfileImageUpload
              onImageChange={handleImageChange}
              previewUrl={previewUrl}
              setPreviewUrl={setPreviewUrl}
            />
          </div>
          <ProfileHeader 
            username={username_}
            onShare={onShare}
          />
        </div>
      </div>

      <ProfileStats userId={user?.id || ''} />

      <div className="mt-6">
        <ProfileBio
          bio={bio}
          isEditing={isEditing}
          onBioChange={(e) => setBio(e.target.value)}
          onEdit={() => setIsEditing(true)}
          onCancel={() => setIsEditing(false)}
          onSubmit={handleSubmit}
          saving={saving}
          isOwnProfile={true}
        />
      </div>

      <div className="mt-6">
        <ProfileFavorites
          userId={user?.id}
          isEditing={isFavoritesEditing}
          onEditComplete={() => setIsFavoritesEditing(false)}
        />
      </div>
    </div>
  );
}