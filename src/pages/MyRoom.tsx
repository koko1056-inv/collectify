import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MyRoomHome } from "@/components/home/MyRoomHome";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { WelcomeOnboarding } from "@/components/onboarding/WelcomeOnboarding";
import { ShareRoomButtons } from "@/components/room/ShareRoomButtons";

export default function MyRoom() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { onboardingState, isInitialized, completeWelcome } = useOnboarding();

  // DB同期が完了するまで何も表示しない（オンボーディングのちらつき防止）
  if (user && !isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const showWelcome = !!user && !onboardingState.hasCompletedWelcome;
  if (showWelcome) {
    return <WelcomeOnboarding onComplete={() => completeWelcome()} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.03)_0%,transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-muted/30 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--foreground)) 0.5px, transparent 0.5px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>
      <Navbar />
      <main className="relative z-10 w-full pb-24">
        <div className="max-w-4xl mx-auto px-4 pt-4 flex justify-end">
          <ShareRoomButtons
            username={profile?.username}
            displayName={profile?.display_name}
          />
        </div>
        <MyRoomHome profile={profile} />
      </main>
      <Footer />
    </div>
  );
}
