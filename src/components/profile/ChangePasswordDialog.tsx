import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MIN_LENGTH = 6;

/**
 * ログイン中にパスワードを変える。
 * ユーザー名で登録したアカウントはメールでの再設定ができないので、ログインできているうちに変えられる場所が要る。
 */
export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== password;
  const canSave = password.length >= MIN_LENGTH && confirm === password && !saving;

  const reset = () => {
    setPassword("");
    setConfirm("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("profileScreen.account.passwordChanged"));
      reset();
      onOpenChange(false);
    } catch (err) {
      console.error("updateUser(password) failed:", err);
      toast.error(t("profileScreen.common.error"), { description: t("profileScreen.account.passwordChangeFailed") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (saving) return;
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("profileScreen.account.changePassword")}</DialogTitle>
            <DialogDescription>{t("profileScreen.account.changePasswordDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-password">{t("profileScreen.account.newPassword")}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordRequirements password={password} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t("profileScreen.account.confirmPassword")}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={mismatch}
            />
            {mismatch && <p className="text-xs text-destructive">{t("profileScreen.account.passwordMismatch")}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!canSave} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("profileScreen.account.savePassword")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
