
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ShareModal } from "@/components/ShareModal";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { UserCollection } from "@/components/UserCollection";

export default function UserProfile() {
  const { userId } = useParams();
  const [username, setUsername] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-3xl mx-auto space-y-6">
          <ProfileCard
            onShare={() => setIsShareModalOpen(true)}
            setUsername={setUsername}
            userId={userId}
          />
          <UserCollection selectedTags={[]} userId={userId} />
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
