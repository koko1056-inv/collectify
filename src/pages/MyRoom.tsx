import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MyRoomHome } from "@/components/home/MyRoomHome";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { WelcomeOnboarding } from "@/components/onboarding/WelcomeOnboarding";
import type { AvatarGenerationResult } from "@/types/avatar";
import { ensureProfileImagesPublicUrl, setCurrentAvatar } from "@/utils/avatar-storage";

export default function MyRoom() {
  const { user } = useAuth();
  const { profile, refetchProfile } = useProfile(user?.id);
  const { onboardingState } = useOnboarding();
  const [welcomeDone, setWelcomeDone] = useState(false);

  const handleAvatarGenerated = async ({ imageUrl, prompt }: AvatarGenerationResult) => {
    if (!user?.id) return;

    const publicUrl = await ensureProfileImagesPublicUrl({ userId: user.id, sourceUrl: imageUrl });
    await setCurrentAvatar({ userId: user.id, avatarUrl: publicUrl, prompt, itemIds: null, skipGalleryInsert: true });
    await refetchProfile();
  };

  // Show welcome onboarding for new users who haven't completed it
  const showWelcome = !!user && !onboardingState.hasCompletedWelcome && !welcomeDone;

  if (showWelcome) {
    return <WelcomeOnboarding onComplete={() => setWelcomeDone(true)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <Navbar />
      <main className="w-full pt-16 pb-24">
        <MyRoomHome 
          profile={profile} 
          onAvatarGenerated={handleAvatarGenerated} 
        />
      </main>
      <Footer />
    </div>
  );
}
