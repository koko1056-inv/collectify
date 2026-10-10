import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUserPoints } from "@/hooks/usePoints";
import { useThemeColor, themeColors } from "@/contexts/ThemeColorContext";
import { PointIcon } from "@/components/ui/point-icon";
import { InviteCodeSection } from "@/components/invite/InviteCodeSection";
import { Button } from "@/components/ui/button";
import { LogOut, MessageSquarePlus, HelpCircle, Globe, Sun, Moon, SunMoon, Palette, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme, type ColorScheme } from "@/contexts/ColorSchemeContext";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { InstallAppCard } from "@/components/pwa/InstallAppCard";
import { AccountSection } from "./AccountSection";
import { FeedbackSheet } from "@/components/feedback/FeedbackSheet";
import { BlockedUsersSection } from "@/components/safety/BlockedUsersSection";

interface ProfileSettingsSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ProfileSettingsSheet({ open, onOpenChange }: ProfileSettingsSheetProps) {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { colorScheme, setColorScheme } = useColorScheme();
  const { themeColor, setThemeColor } = useThemeColor();
  const { data: userPoints } = useUserPoints();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col"
        // 開いた瞬間に先頭のボタンへフォーカスが当たり、赤い枠が出ていた
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="text-left">{t("profileScreen.settings.title")}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 並びは「表示 → ポイント・招待 → アプリ → アカウント → ログアウト」。
              以前は先頭にポイント残高と招待が大きく出て、設定を探しにくかった。
              メッセージはヘッダーに入口を置いたのでここからは外した */}
          <SectionHeading>{t("profileScreen.settings.display")}</SectionHeading>
          <section className="bg-card rounded-2xl border border-border divide-y divide-border">
            <SettingRow
              icon={<Globe className="w-4 h-4" />}
              label={t("chrome.nav.language")}
              onClick={() => setLanguage(language === "ja" ? "en" : "ja")}
              hint={language === "ja" ? "日本語 → English" : "English → 日本語"}
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
                      "flex flex-col items-center gap-1 rounded-xl border py-2.5 text-2xs font-medium transition-colors",
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


          {/* テーマカラー（以前はアバターのメニューにだけあった） */}
          <section className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("chrome.nav.themeColor")}</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {themeColors.map((color) => {
                const active = themeColor === color.value;
                return (
                  <button
                    key={color.value}
                    onClick={() => setThemeColor(color.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border py-2.5 text-3xs font-medium transition-colors",
                      active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {/* 色見本。選んでいるものは外側に細い輪を足す（以前は絵文字だった） */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-5 w-5 rounded-full bg-[color:var(--swatch)] dark:bg-[color:var(--swatch-dark)]",
                        active
                          ? "ring-2 ring-foreground/70 ring-offset-2 ring-offset-card"
                          : "ring-1 ring-inset ring-black/10 dark:ring-white/15"
                      )}
                      style={{ "--swatch": color.swatch.light, "--swatch-dark": color.swatch.dark } as React.CSSProperties}
                    />
                    {t(`chrome.themeColor.${color.value}`)}
                  </button>
                );
              })}
            </div>
          </section>

          <SectionHeading>{t("profileScreen.settings.pointsAndInvite")}</SectionHeading>
          <section className="bg-card rounded-2xl border border-border divide-y divide-border">
            <SettingRow
              icon={<PointIcon size={16} />}
              label={t("chrome.nav.pointsUnit")}
              hint={userPoints ? `${userPoints.total_points.toLocaleString()}pt` : undefined}
              onClick={() => {
                onOpenChange(false);
                navigate("/point-shop");
              }}
              chevron
            />
          </section>
          <section className="bg-card rounded-2xl border border-border p-5">
            <InviteCodeSection />
          </section>

          <SectionHeading>{t("profileScreen.settings.app")}</SectionHeading>
          {/* ホーム画面に追加（PWA） */}
          <InstallAppCard variant="section" />
          <section className="bg-card rounded-2xl border border-border divide-y divide-border">
            <SettingRow
              icon={<HelpCircle className="w-4 h-4" />}
              label={t("profileScreen.settings.howTo")}
              onClick={() => {
                onOpenChange(false);
                navigate("/how-to-use");
              }}
              chevron
            />
            <SettingRow
              icon={<MessageSquarePlus className="w-4 h-4" />}
              label={t("engage.feedback.settingsRow")}
              onClick={() => setFeedbackOpen(true)}
              chevron
            />
          </section>

          {/* ブロックしたユーザー（一覧と解除） */}
          <BlockedUsersSection />

          {/* アカウント（データの書き出し・退会） */}
          <AccountSection onDeleted={() => onOpenChange(false)} />

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
      <FeedbackSheet open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </Sheet>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="-mb-3 px-1 text-xs font-bold text-muted-foreground">{children}</h3>;
}

function SettingRow({
  icon,
  label,
  hint,
  onClick,
  chevron,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  chevron?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
    >
      <div className="text-muted-foreground">{icon}</div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {hint && <span className="text-xs tabular-nums text-muted-foreground">{hint}</span>}
      {chevron && <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
    </button>
  );
}
