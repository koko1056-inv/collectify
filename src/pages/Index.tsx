import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InitialInterestSelection } from "@/components/InitialInterestSelection";
import { Tag } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { RecommendedUsers } from "@/components/home/RecommendedUsers";
import { PersonalizedContent } from "@/components/home/PersonalizedContent";
import { NotificationHistory } from "@/components/home/NotificationHistory";
import { HomeTitle } from "@/components/home/HomeTitle";

const Index = () => {
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");

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
        <HomeTitle />

        <div className="space-y-8">
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