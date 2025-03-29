
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProfileCard } from "./ProfileCard";
import { ShareModal } from "@/components/ShareModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

export function ProfilePage() {
  const isMobile = useIsMobile();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [username, setUsername] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      <main className={`container mx-auto pt-28 ${isMobile ? 'px-0' : 'px-4'}`}>
        <div className={`${isMobile ? '' : 'max-w-3xl mx-auto'} space-y-6`}>
          <ProfileCard 
            onShare={() => setIsShareModalOpen(true)}
            setUsername={setUsername}
          />
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
