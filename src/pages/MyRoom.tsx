import { Navbar } from "@/components/Navbar";
import { Loader2 } from "lucide-react";
import { Footer } from "@/components/Footer";
import { MyRoomHome } from "@/components/home/MyRoomHome";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useOnboarding } from "@/contexts/OnboardingContext";

export default function MyRoom() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { isInitialized } = useOnboarding();

  // DB同期が完了するまで何も表示しない（オンボーディングのちらつき防止）
  if (user && !isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // ウェルカムの表示は App 直下の OnboardingGate が担当する。
  // ここで出していた頃は、着地点が /collection に移って以降
  // 新規ユーザーに一度も表示されていなかった。

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
      <main
        data-tour="myroom-main"
        className="relative z-10 w-full pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-8"
      >
        <MyRoomHome profile={profile} />
      </main>
      <Footer />
    </div>
  );
}
