import { useNavigate } from "react-router-dom";
import { QuickAddFlow } from "@/components/add-item/QuickAddFlow";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function QuickAdd() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <QuickAddFlow
        onComplete={() => navigate("/my-room")}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
