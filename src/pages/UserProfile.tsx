
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareModal } from "@/components/ShareModal";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileBio } from "@/components/profile/ProfileBio";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { FollowButton } from "@/components/profile/FollowButton";
import { Avatar } from "@/components/ui/avatar";
import { ProfileCollection } from "@/components/profile/ProfileCollection";

export default function UserProfile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
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
      setAvatarUrl(profile.avatar_url);
      setLoading(false);
    };

    fetchProfile();
  }, [userId, toast]);

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
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <img
                    src={avatarUrl || "/placeholder.svg"}
                    alt={username}
                    className="object-cover w-full h-full"
                  />
                </Avatar>
                <div>
                  <ProfileHeader 
                    username={username}
                    onShare={() => setIsShareModalOpen(true)}
                  />
                  {user && user.id !== userId && (
                    <FollowButton userId={userId} />
                  )}
                </div>
              </div>
            </div>

            <ProfileStats userId={userId} />

            <div className="mt-6">
              <ProfileBio
                bio={bio}
                isEditing={false}
                saving={false}
                onBioChange={() => {}}
                onEdit={() => {}}
                onCancel={() => {}}
                onSubmit={() => {}}
                isOwnProfile={user?.id === userId}
              />
            </div>
          </div>

          <ProfileCollection userId={userId} />
        </div>
      </main>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={`${username}のプロフィール`}
        url={window.location.href}
        image="/placeholder.svg"
      />

      <Footer />
    </div>
  );
}
