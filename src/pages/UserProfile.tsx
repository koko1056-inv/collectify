import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShareModal } from "@/components/ShareModal";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/search?tab=friends");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      <main className={`container mx-auto pt-20 ${isMobile ? 'px-2 py-2' : 'px-4 py-4'}`}>
        <div className="max-w-3xl mx-auto space-y-4">
          {/* 戻るボタン */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </Button>
          
          <ProfileCard
            onShare={() => setIsShareModalOpen(true)}
            setUsername={setUsername}
            userId={userId}
          />
        </div>
      </main>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={`${username}のプロフィール`}
        url={window.location.href}
        image="/placeholder.svg"
      />

      <Footer />
    </div>
  );
}
