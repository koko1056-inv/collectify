
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { FollowList } from "./profile/FollowList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface FriendsListSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FriendsListSheet({ isOpen, onClose }: FriendsListSheetProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        toast({
          title: "エラー",
          description: "ログインが必要です",
          variant: "destructive",
        });
        navigate("/login");
      }
    };

    if (isOpen) {
      fetchCurrentUser();
    }
  }, [isOpen, navigate, toast]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90%] p-0">
        <SheetHeader className="border-b p-4 sticky top-0 bg-white">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose} className="-ml-2">
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <SheetTitle>フレンド</SheetTitle>
          </div>
        </SheetHeader>
        
        {userId ? (
          <div className="p-4">
            <Tabs defaultValue="following">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="following" className="flex-1">フォロー中</TabsTrigger>
                <TabsTrigger value="followers" className="flex-1">フォロワー</TabsTrigger>
              </TabsList>
              
              <TabsContent value="following">
                <FollowList userId={userId} type="following" />
              </TabsContent>
              
              <TabsContent value="followers">
                <FollowList userId={userId} type="followers" />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="p-4 flex items-center justify-center h-40">
            <p>読み込み中...</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
