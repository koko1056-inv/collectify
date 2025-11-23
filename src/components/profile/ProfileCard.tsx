import { useState, useEffect, memo } from "react";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [xUsername, setXUsername] = useState("");
  const [username_, setUsername_] = useState("");
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
      console.log("[ProfileCard] Profile data updated:", {
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url
      });
      setBio(profile.bio || "");
      setXUsername(profile.x_username || "");
      setUsername_(profile.username || "");
      setUsername(profile.username || "");
      // 初回ロード時もアバターURLを設定
      if (profile.avatar_url) {
        setPreviewUrl(profile.avatar_url);
      }
      setLoading(false);
    }
  }, [profile, setUsername]);

  // アバターURLが変更されたときにプレビューURLを更新
  useEffect(() => {
    if (profile?.avatar_url) {
      console.log("[ProfileCard] Avatar URL changed to:", profile.avatar_url);
      setPreviewUrl(profile.avatar_url);
    }
  }, [profile?.avatar_url]);

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
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase
        .storage
        .from("profile_images")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase
        .storage
        .from("profile_images")
        .getPublicUrl(filePath);

      // 1. まずprofiles.avatar_urlを更新（これが最も重要）
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      // 2. avatar_galleryの同期（統一処理）
      try {
        // すべてのアバターをis_current=falseに設定
        await supabase
          .from("avatar_gallery")
          .update({ is_current: false })
          .eq("user_id", user.id);

        // 既存のプロフィール画像エントリを探す
        const { data: existingProfileAvatar } = await supabase
          .from("avatar_gallery")
          .select("id")
          .eq("user_id", user.id)
          .eq("prompt", "プロフィール画像")
          .maybeSingle();

        if (existingProfileAvatar) {
          // 既存エントリを更新
          await supabase
            .from("avatar_gallery")
            .update({ 
              image_url: publicUrl,
              is_current: true 
            })
            .eq("id", existingProfileAvatar.id);
        } else {
          // 新規エントリを作成
          await supabase.from("avatar_gallery").insert({
            user_id: user.id,
            image_url: publicUrl,
            is_current: true,
            item_ids: null,
            prompt: "プロフィール画像",
          });
        }
      } catch (galleryError) {
        console.error("Error syncing avatar_gallery:", galleryError);
        // ギャラリー同期失敗時もプロフィール更新は成功しているので続行
      }

      await refetchProfile();

      setPreviewUrl(publicUrl);
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
      console.error("Error uploading image:", error);
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
      />

      <ProfileStats userId={effectiveUserId} />

      {isOwnProfile && (
        <ProfileEditButton onClick={() => setIsEditing(true)} />
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
