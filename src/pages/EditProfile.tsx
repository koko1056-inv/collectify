import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { CollectionGoodsCard } from "@/components/CollectionGoodsCard";
import { ShareModal } from "@/components/ShareModal";
import { Share2, Camera, Edit, Check, X } from "lucide-react";
import { UserInfo } from "@/components/UserInfo";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileBio } from "@/components/profile/ProfileBio";
import { ProfileFavorites } from "@/components/profile/ProfileFavorites";

export default function EditProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [favoriteItems, setFavoriteItems] = useState<any[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

    const fetchFavoriteItems = async () => {
      const { data: items, error } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_shared", true)
        .order("created_at", { ascending: false })
        .limit(4);

      if (error) {
        toast({
          variant: "destructive",
          title: "エラー",
          description: "お気に入りアイテムの取得に失敗しました",
        });
        return;
      }

      setFavoriteItems(items);
    };

    fetchProfile();
    fetchFavoriteItems();
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
        <div className="max-w-3xl mx-auto space-y-6">
          <ProfileHeader 
            username={username}
            onScreenshot={() => {/* TODO */}}
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
            favoriteItems={favoriteItems}
            userId={user?.id}
            onCollectionEdit={() => navigate("/collection")}
          />
        </div>
      </main>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={`${username}のプロフィール`}
        url={window.location.href}
        image={favoriteItems[0]?.image || "/placeholder.svg"}
      />
    </div>
  );
}
