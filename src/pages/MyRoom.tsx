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
  const { onboardingState, isInitialized, completeWelcome } = useOnboarding();

  const handleAvatarGenerated = async ({ imageUrl, prompt }: AvatarGenerationResult) => {
    if (!user?.id) return;

    const publicUrl = await ensureProfileImagesPublicUrl({ userId: user.id, sourceUrl: imageUrl });
    await setCurrentAvatar({ userId: user.id, avatarUrl: publicUrl, prompt, itemIds: null, skipGalleryInsert: true });
    await refetchProfile();
  };

  // DB同期が完了するまで何も表示しない（オンボーディングのちらつき防止）
  if (user && !isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Show welcome onboarding for new users who haven't completed it
  const showWelcome = !!user && !onboardingState.hasCompletedWelcome;

  if (showWelcome) {
    return <WelcomeOnboarding onComplete={() => completeWelcome()} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 部屋感のある背景テクスチャ */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.03)_0%,transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-muted/30 to-transparent" />
        {/* 微細なドットパターン（棚の壁紙イメージ） */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}
        />
      </div>
      <Navbar />
      <main className="relative z-10 w-full pt-16 pb-24">
        <MyRoomHome 
          profile={profile} 
          onAvatarGenerated={handleAvatarGenerated} 
        />
      </main>
      <Footer />
    </div>
  );
}
