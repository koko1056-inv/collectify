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

  const handleScreenshot = () => {
    // Here you would implement screenshot functionality
    toast({
      title: "スクリーンショット",
      description: "プロフィールのスクリーンショットを保存しました",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="max-w-2xl mx-auto space-y-8">
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
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">プロフィール</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleScreenshot}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                スクショ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsShareModalOpen(true)}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                共有
              </Button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm space-y-6" id="profile-card">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{username}</h2>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  編集
                </Button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="bio"
                    className="text-sm font-medium text-gray-700 block"
                  >
                    自己紹介
                  </label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="好きなアーティスト/キャラクター、推しポイント、収集歴などを自由に書いてください"
                    className="min-h-[200px]"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">お気に入りコレクション</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/collection")}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                編集
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {favoriteItems.map((item) => (
                <CollectionGoodsCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={item.image}
                  isShared={item.is_shared}
                  userId={user.id}
                />
              ))}
            </div>
          </div>
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