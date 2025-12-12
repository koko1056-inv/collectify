import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { InitialInterestSelection } from "@/components/InitialInterestSelection";
import { OnboardingWalkthrough } from "@/components/onboarding/OnboardingWalkthrough";
import { useOnboardingWalkthrough } from "@/hooks/useOnboardingWalkthrough";
import { HomeContent } from "@/components/home/HomeContent";
import { UserProfileCollection } from "@/components/home/UserProfileCollection";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfile } from "@/hooks/useProfile";

const Index = () => {
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");
  const isMobile = useIsMobile();
  const { showWalkthrough, setShowWalkthrough } = useOnboardingWalkthrough();
  
  const { profile, refetchProfile, isLoading: isLoadingProfile } = useProfile(user?.id);
  const { profile: viewedProfile, isLoading: isLoadingViewedProfile } = useProfile(userId);

  // ユーザーの興味関心がnullの場合のみダイアログを表示（初回ログイン時のみ）
  useEffect(() => {
    if (user && profile && profile.interests === null) {
      setShowInterestDialog(true);
    }
  }, [user, profile]);

  const handleInterestDialogClose = () => {
    setShowInterestDialog(false);
    refetchProfile();
  };

  // ユーザーのコレクションを表示するか、ホームページを表示するか
  const showUserCollection = !!userId && !!viewedProfile;

  // 他ユーザーのプロフィールを見ているときのローディング表示のみ
  if (userId && isLoadingViewedProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-1 py-4 pt-0 pb-24 sm:px-2 sm:py-8 sm:pt-20 sm:pb-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">読み込み中...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-1 py-4 pt-0 pb-24 sm:px-2 sm:py-8 sm:pt-20 sm:pb-8">
        <div className={`space-y-4 sm:space-y-6 ${isMobile ? "pt-2" : ""}`}>
          {showUserCollection ? (
            <UserProfileCollection 
              viewedProfile={viewedProfile} 
              userId={userId} 
            />
          ) : (
            <HomeContent profile={profile} />
          )}
        </div>
      </main>
      <Footer />
      
      <OnboardingWalkthrough
        open={showWalkthrough}
        onClose={() => setShowWalkthrough(false)}
      />
      
      {user && (
        <InitialInterestSelection
          isOpen={showInterestDialog}
          onClose={handleInterestDialogClose}
        />
      )}
    </div>
  );
};

export default Index;
