import { memo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

export const UserInfo = memo(function UserInfo() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  if (!user || !profile?.username) return null;

  return <div className="text-sm text-gray-600">{profile.username}</div>;
});
