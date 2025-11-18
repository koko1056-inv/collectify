
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className={`container mx-auto ${isMobile ? 'pt-16 pb-20 px-0' : 'pt-20 pb-8 px-4'}`}>
        <div className={`${isMobile ? 'min-h-screen' : 'max-w-3xl mx-auto'} space-y-4`}>
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
