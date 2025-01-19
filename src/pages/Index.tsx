import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InitialInterestSelection } from "@/components/InitialInterestSelection";
import { Tag } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { FeaturedCarousel } from "@/components/home/FeaturedCarousel";
import { RecommendedUsers } from "@/components/home/RecommendedUsers";
import { PersonalizedContent } from "@/components/home/PersonalizedContent";
import { NotificationHistory } from "@/components/home/NotificationHistory";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");
  const navigate = useNavigate();

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      return data;
    },
    enabled: !!user,
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Tag[];
    },
  });

  useEffect(() => {
    if (user && profile && (!profile.interests || profile.interests.length === 0)) {
      setShowInterestDialog(true);
    }
  }, [user, profile]);

  const handleInterestDialogClose = () => {
    setShowInterestDialog(false);
    refetchProfile();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-2 py-4 pt-0 pb-24 sm:px-4 sm:py-8 sm:pt-20 sm:pb-8">
        {/* Mobile App Title */}
        <div className="flex items-center justify-center mb-6 sm:hidden mt-1">
          <span className="logo-text">Collectify</span>
        </div>

        <div className="space-y-8">
          {/* Quick Actions */}
          <section className="animate-fade-in">
            <div className="flex gap-4 justify-center sm:justify-start">
              <Button
                onClick={() => navigate("/add-item")}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                アイテムを追加
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/feed")}
                className="flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                トレンド
              </Button>
            </div>
          </section>

          {/* Featured Content */}
          <section className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-4">注目のコレクション</h2>
            <FeaturedCarousel />
          </section>

          {/* Recommended Users */}
          <section className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-4">おすすめのユーザー</h2>
            <RecommendedUsers />
          </section>

          {/* Personalized Content */}
          {user && (
            <section className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-4">あなたにおすすめ</h2>
              <PersonalizedContent userId={user.id} />
            </section>
          )}

          {/* Notification History */}
          {user && (
            <section className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-4">最新の通知</h2>
              <NotificationHistory userId={user.id} />
            </section>
          )}

          {user && (
            <InitialInterestSelection
              isOpen={showInterestDialog}
              onClose={handleInterestDialogClose}
              tags={allTags}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;