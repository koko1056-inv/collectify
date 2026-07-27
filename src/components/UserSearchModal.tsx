import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Profile {
  id: string;
  username: string;
  avatar_url?: string | null;
}

export function UserSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [username, setUsername] = useState("");
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (username.trim().length < 1) {
        setSuggestions([]);
        return;
      }

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${username}%`)
        .limit(5);

      if (error) {
        console.error("Error fetching suggestions:", error);
        return;
      }

      setSuggestions(profiles || []);
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [username]);

  const handleSelectUser = (profile: Profile) => {
    navigate(`/user/${profile.id}`);
    onClose();
    setUsername("");
    setSuggestions([]);
  };

  const handleSearch = async () => {
    if (!username.trim()) {
      toast.error(t("chrome.common.error"), {
        description: t("chrome.userSearch.enterUsername"),
      });
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", username)
      .maybeSingle();

    if (error || !profile) {
      toast.error(t("chrome.common.error"), {
        description: t("chrome.friends.noUsersFound"),
      });
      return;
    }

    navigate(`/user/${profile.id}`);
    onClose();
    setUsername("");
    setSuggestions([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("chrome.userSearch.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Input
              placeholder={t("chrome.userSearch.inputPlaceholder")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          {suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleSelectUser(profile)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="flex-1 text-left">{profile.username}</span>
                </button>
              ))}
            </div>
          )}
          {username && suggestions.length === 0 && (
            <Button onClick={handleSearch} className="w-full">
              {t("chrome.userSearch.searchFor", { name: username })}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}