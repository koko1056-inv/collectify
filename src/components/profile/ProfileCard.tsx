import { useState, useEffect, memo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfileStats } from "./ProfileStatsOptimized";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfile } from "@/hooks/useProfile";
import { ProfileImageSection } from "./ProfileImageSection";
import { ProfileEditButton } from "./ProfileEditButton";
import { ProfileBioSection } from "./ProfileBioSection";
import { ProfileInterestsSection } from "./ProfileInterestsSection";
import { ProfileFavoritesSection } from "./ProfileFavoritesSection";
import { ProfileWishlistSection } from "./ProfileWishlistSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfileImageUpload } from "@/hooks/useProfileImageUpload";

interface ProfileCardProps {
  onShare: () => void;
  setUsername: (username: string) => void;
  userId?: string;
}

export const ProfileCard = memo(function ProfileCard({
  onShare,
  setUsername,
  userId
}: ProfileCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [xUsername, setXUsername] = useState("");
  const [username_, setUsername_] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isFavoritesEditing, setIsFavoritesEditing] = useState(false);
  const isMobile = useIsMobile();
  const isOwnProfile = !userId || user?.id === userId;
  const effectiveUserId = userId || user?.id;

  const { profile, refetchProfile } = useProfile(effectiveUserId);

  // プロフィール画像アップロードフック
  const {
    uploadImage,
    isUploading,
    previewUrl,
    setPreviewUrl,
    initializePreview,
  } = useProfileImageUpload({
    userId: effectiveUserId || "",
    onSuccess: () => refetchProfile(),
  });

  // プロフィールデータをローカル状態に設定
  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setXUsername(profile.x_username || "");
      setUsername_(profile.username || "");
      setUsername(profile.username || "");
      // アバターURLを初期化
      initializePreview(profile.avatar_url || null);
      setLoading(false);
    }
  }, [profile, setUsername, initializePreview]);

  // 画像変更ハンドラー
  const handleImageChange = useCallback(async (file: File | null) => {
    if (!file || !isOwnProfile) return;
    await uploadImage(file);
  }, [isOwnProfile, uploadImage]);

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
    <div className={`${isMobile ? 'bg-white min-h-screen p-4' : 'bg-white p-8 rounded-lg shadow'}`}>
      <ProfileImageSection
        isOwnProfile={isOwnProfile}
        userId={effectiveUserId}
        avatarUrl={profile?.avatar_url || null}
        username={username_}
        previewUrl={previewUrl}
        onImageChange={handleImageChange}
        onShare={onShare}
        setPreviewUrl={setPreviewUrl}
        isUploading={isUploading}
      />

      <ProfileStats userId={effectiveUserId} />

      {isOwnProfile && (
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            onClick={() => navigate("/messages")}
            className="flex-1"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            メッセージ一覧
          </Button>
          <ProfileEditButton onClick={() => setIsEditing(true)} />
        </div>
      )}

      <ProfileBioSection
        bio={bio}
        xUsername={xUsername}
        isEditing={isEditing}
        isOwnProfile={isOwnProfile}
        saving={saving}
        onBioChange={(e) => setBio(e.target.value)}
        onXUsernameChange={(e) => setXUsername(e.target.value)}
        onEdit={() => setIsEditing(true)}
        onCancel={() => setIsEditing(false)}
        onSubmit={handleSubmit}
      />

      {isOwnProfile && (
        <ProfileInterestsSection
          currentInterests={profile?.interests || []}
          onUpdate={refetchProfile}
        />
      )}

      <ProfileFavoritesSection
        userId={effectiveUserId}
        isEditing={isFavoritesEditing}
        onEditComplete={() => setIsFavoritesEditing(false)}
      />

      {effectiveUserId && (
        <ProfileWishlistSection userId={effectiveUserId} />
      )}

    </div>
  );
});
