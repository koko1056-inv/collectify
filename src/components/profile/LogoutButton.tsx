
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";

export function LogoutButton() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(t("profileScreen.common.error"), {
        description: t("profileScreen.logout.failed"),
      });
      return;
    }

    toast.success(t("profileScreen.logout.doneTitle"), {
      description: t("profileScreen.logout.doneDesc"),
    });
    navigate("/login");
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline"
          size="icon"
          className="h-8 w-8"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("profileScreen.logout.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("profileScreen.logout.confirm")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("profileScreen.common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout}>{t("profileScreen.logout.title")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
