
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProfileCard } from "./ProfileCard";
import { PointBalanceCard } from "./PointBalanceCard";
import { ProfileItemPosts } from "./ProfileItemPosts";
import { ShareModal } from "@/components/ShareModal";
import { InviteCodeSection } from "@/components/invite/InviteCodeSection";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

export function ProfilePage() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [username, setUsername] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className={`container mx-auto ${isMobile ? 'pt-16 pb-20 px-0' : 'pt-20 pb-8 px-4'}`}>
        <div className={`${isMobile ? 'min-h-screen' : 'max-w-3xl mx-auto'} space-y-4`}>
          <ProfileCard
            onShare={() => setIsShareModalOpen(true)}
            setUsername={setUsername}
          />
          <div className={`${isMobile ? 'mx-4' : ''} bg-card rounded-xl border border-border p-6`}>
            <PointBalanceCard />
          </div>
          {user?.id && (
            <div className={`${isMobile ? 'mx-4' : ''} bg-card rounded-xl border border-border p-6`}>
              <ProfileItemPosts userId={user.id} />
            </div>
          )}
          <div className={`${isMobile ? 'mx-4' : ''} bg-card rounded-xl border border-border p-6`}>
            <InviteCodeSection />
          </div>
        </div>
      </main>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={username}
        url={window.location.href}
        image="/placeholder.svg"
      />
      <Footer />
    </div>
  );
}
