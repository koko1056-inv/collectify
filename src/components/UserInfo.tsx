import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function UserInfo() {
  const { user } = useAuth();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsername() {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (!error && data) {
          setUsername(data.username);
        }
      }
    }

    fetchUsername();
  }, [user]);

  if (!user || !username) return null;

  return (
    <div className="text-sm text-gray-600">
      ログイン中のユーザー: {username}
    </div>
  );
}