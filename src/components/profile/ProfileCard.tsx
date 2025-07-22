import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileBio } from "./ProfileBio";
import { ProfileFavorites } from "./ProfileFavorites";
import { ProfileImageUpload } from "./ProfileImageUpload";
import { ProfileWishlist } from "./ProfileWishlist";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProfileInterests } from "./ProfileInterests";
import { useProfile } from "@/hooks/useProfile";
import { UserStatsCard } from "@/components/ui/user-stats-card";

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
  const [xUsername, setXUsername] = useState("");
  const [username_, setUsername_] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isFavoritesEditing, setIsFavoritesEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const isOwnProfile = !userId || user?.id === userId;
  const effectiveUserId = userId || user?.id;

  const { profile, refetchProfile } = useProfile(effectiveUserId);

  // プロフィールデータをローカル状態に設定
  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setXUsername(profile.x_username || "");
      setUsername_(profile.username || "");
      setUsername(profile.username || "");
      setAvatarUrl(profile.avatar_url);
      setPreviewUrl(profile.avatar_url);
      setLoading(false);
    }
  }, [profile, setUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isOwnProfile) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        bio,
        x_username: xUsername
      })
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

    // プロフィールデータを再取得
    refetchProfile();

    toast({
      title: "更新完了",
      description: "プロフィールを更新しました"
    });
  };

  const handleImageChange = async (file: File | null) => {
    if (!file || !user || !isOwnProfile) return;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase
        .storage
        .from('profile_images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase
        .storage
        .from('profile_images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl
        })
        .eq('id', user.id);

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
    <div className={`${isMobile ? 'bg-white' : 'bg-white p-8 rounded-lg shadow'}`}>
      <div className="flex flex-col items-center mb-4">
        <div className="w-24 h-24 mb-2">
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
        <ProfileHeader username={username_} onShare={onShare} isOwnProfile={isOwnProfile} userId={userId} />
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
          xUsername={xUsername}
          isEditing={isEditing} 
          onBioChange={e => setBio(e.target.value)} 
          onXUsernameChange={e => setXUsername(e.target.value)}
          onEdit={() => setIsEditing(true)} 
          onCancel={() => setIsEditing(false)} 
          onSubmit={handleSubmit} 
          saving={saving} 
          isOwnProfile={isOwnProfile} 
        />
      </div>

      {isOwnProfile && (
        <div className="mt-6">
          <ProfileInterests 
            currentInterests={profile?.interests || []} 
            onUpdate={refetchProfile}
          />
        </div>
      )}

      {/* 統計情報セクションを追加（自分のプロフィールのみ） */}
      {isOwnProfile && (
        <div className="mt-6">
          <UserStatsCard showHistoricalButton={false} />
        </div>
      )}

      <div className="mt-6">
        <ProfileFavorites 
          userId={effectiveUserId} 
          isEditing={isFavoritesEditing} 
          onEditComplete={() => setIsFavoritesEditing(false)} 
        />
      </div>

      {/* ウィッシュリストセクションを追加 */}
      <div className="mt-8">
        {effectiveUserId && <ProfileWishlist userId={effectiveUserId} />}
      </div>
    </div>
  );
}
