import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PointBalanceCard } from "./PointBalanceCard";
import { InviteCodeSection } from "@/components/invite/InviteCodeSection";
import { Button } from "@/components/ui/button";
import { LogOut, MessageSquare, HelpCircle, Globe, Sun, Moon, SunMoon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme, type ColorScheme } from "@/contexts/ColorSchemeContext";
import { cn } from "@/lib/utils";

interface ProfileSettingsSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ProfileSettingsSheet({ open, onOpenChange }: ProfileSettingsSheetProps) {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { colorScheme, setColorScheme } = useColorScheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="text-left">{t("profileScreen.settings.title")}</SheetTitle>
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
              label={t("profileScreen.settings.messages")}
              onClick={() => {
                onOpenChange(false);
                navigate("/messages");
              }}
            />
            <SettingRow
              icon={<HelpCircle className="w-4 h-4" />}
              label={t("profileScreen.settings.howTo")}
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

          {/* 表示テーマ（ライト / ダーク / 端末設定に追従） */}
          <section className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <SunMoon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {t("profileScreen.settings.appearance")}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "light", icon: Sun, label: t("profileScreen.settings.appearanceLight") },
                  { value: "dark", icon: Moon, label: t("profileScreen.settings.appearanceDark") },
                  { value: "system", icon: SunMoon, label: t("profileScreen.settings.appearanceSystem") },
                ] as { value: ColorScheme; icon: typeof Sun; label: string }[]
              ).map(({ value, icon: Icon, label }) => {
                const active = colorScheme === value;
                return (
                  <button
                    key={value}
                    onClick={() => setColorScheme(value)}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ログアウト */}
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
          >
            <LogOut className="w-4 h-4" />
            {t("profileScreen.logout.title")}
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
