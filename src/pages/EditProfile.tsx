import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareModal } from "@/components/ShareModal";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileBio } from "@/components/profile/ProfileBio";
import { ProfileFavorites } from "@/components/profile/ProfileFavorites";
import html2canvas from "html2canvas";

export default function EditProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingFavorites, setIsEditingFavorites] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

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
      setUsername(profile.username || "");
      setLoading(false);
    };

    fetchProfile();
  }, [user, navigate, toast]);

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

  const handleScreenshot = async () => {
    const element = document.getElementById('profile-card');
    if (!element) return;

    try {
      const canvas = await html2canvas(element);
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'profile.png';
      link.href = dataUrl;
      link.click();

      toast({
        title: "スクリーンショット完了",
        description: "プロフィールカードの画像を保存しました",
      });
    } catch (error) {
      console.error('Screenshot error:', error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "スクリーンショットの保存に失敗しました",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="max-w-3xl mx-auto space-y-8">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-8 w-32" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div id="profile-card" className="max-w-3xl mx-auto space-y-6 bg-white p-6 rounded-lg shadow">
          <ProfileHeader 
            username={username}
            onScreenshot={handleScreenshot}
            onShare={() => setIsShareModalOpen(true)}
          />

          <ProfileBio
            bio={bio}
            isEditing={isEditing}
            onBioChange={(e) => setBio(e.target.value)}
            onEdit={() => setIsEditing(true)}
            onCancel={() => setIsEditing(false)}
            onSubmit={handleSubmit}
            saving={saving}
          />

          <ProfileFavorites
            userId={user?.id}
            isEditing={isEditingFavorites}
            onEditComplete={() => setIsEditingFavorites(false)}
          />
        </div>
      </main>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={`${username}のプロフィール`}
        url={window.location.href}
        image="/placeholder.svg"
      />
    </div>
  );
}