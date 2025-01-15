import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowLeft, User } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  avatar_url?: string | null;
}

export function UserSearchSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [username, setUsername] = useState("");
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

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
      toast({
        title: "エラー",
        description: "ユーザー名を入力してください",
        variant: "destructive",
      });
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", username)
      .maybeSingle();

    if (error || !profile) {
      toast({
        title: "エラー",
        description: "ユーザーが見つかりませんでした",
        variant: "destructive",
      });
      return;
    }

    navigate(`/user/${profile.id}`);
    onClose();
    setUsername("");
    setSuggestions([]);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90%] p-0">
        <SheetHeader className="border-b p-4 sticky top-0 bg-white">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose} className="-ml-2">
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div className="flex-1 flex items-center gap-2 bg-accent rounded-full px-4 py-2">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder="ユーザー名を検索"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              />
            </div>
          </div>
        </SheetHeader>
        <div className="p-4">
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
              「{username}」を検索
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}