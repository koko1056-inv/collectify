import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MyRoomHome } from "@/components/home/MyRoomHome";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

export default function MyRoom() {
  const { user } = useAuth();
  const { profile, refetchProfile } = useProfile(user?.id);

  const handleAvatarGenerated = async () => {
    await refetchProfile();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-20 pb-24 sm:pt-24">
        <MyRoomHome 
          profile={profile} 
          onAvatarGenerated={handleAvatarGenerated} 
        />
      </main>
      <Footer />
    </div>
  );
}
