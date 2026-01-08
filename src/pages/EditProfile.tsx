import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProfilePage } from "@/components/profile/ProfilePage";

export default function EditProfile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) return null;
  if (!user) return null;

  return <ProfilePage />;
}