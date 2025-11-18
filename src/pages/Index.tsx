
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
  
  const { profile, refetchProfile } = useProfile(user?.id);
  const { profile: viewedProfile } = useProfile(userId);

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

  return (
    <div className="min-h-screen bg-gray-50">
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
