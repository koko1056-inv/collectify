import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PointBalanceCard } from "./PointBalanceCard";
import { InviteCodeSection } from "@/components/invite/InviteCodeSection";
import { Button } from "@/components/ui/button";
import { LogOut, MessageSquare, HelpCircle, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileSettingsSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ProfileSettingsSheet({ open, onOpenChange }: ProfileSettingsSheetProps) {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="text-left">設定</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* ポイント */}
          <section className="bg-card rounded-2xl border border-border p-5">
            <PointBalanceCard />
          </section>

          {/* 招待 */}
          <section className="bg-card rounded-2xl border border-border p-5">
            <InviteCodeSection />
          </section>

          {/* 一般 */}
          <section className="bg-card rounded-2xl border border-border divide-y divide-border">
            <SettingRow
              icon={<MessageSquare className="w-4 h-4" />}
              label="メッセージ一覧"
              onClick={() => {
                onOpenChange(false);
                navigate("/messages");
              }}
            />
            <SettingRow
              icon={<HelpCircle className="w-4 h-4" />}
              label="使い方"
              onClick={() => {
                onOpenChange(false);
                navigate("/how-to-use");
              }}
            />
            <SettingRow
              icon={<Globe className="w-4 h-4" />}
              label={language === "ja" ? "日本語" : "English"}
              onClick={() => setLanguage(language === "ja" ? "en" : "ja")}
              hint={language === "ja" ? "Switch to English" : "日本語へ"}
            />
          </section>

          {/* ログアウト */}
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
          >
            <LogOut className="w-4 h-4" />
            ログアウト
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SettingRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
    >
      <div className="text-muted-foreground">{icon}</div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </button>
  );
}
