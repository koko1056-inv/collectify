import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ConversationList } from "@/components/chat/ConversationList";

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto pb-20 px-0 sm:pb-8 sm:px-4">
        <div className="max-w-2xl mx-auto">
          <ConversationList />
        </div>
      </main>
      <Footer />
    </div>
  );
}
