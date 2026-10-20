import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useLineFriendPrompt } from "@/hooks/useLineFriendPrompt";
import { ENABLE_APPLE_LOGIN, ENABLE_LINE_LOGIN, LINE_AUTH_PROVIDER, LINE_OA_BASIC_ID } from "@/config/lineAuth";

interface LineLinkRow {
  notify_enabled: boolean;
  friend_added: boolean | null;
}

/**
 * マイページ設定の「LINE連携」セクション。
 * - LINE通知のON/OFF（line_user_links.notify_enabled。LINE公式アカウントの連携が無ければ、代わりに連携CTAを出す）
 * - LINE / Appleを連携（supabase.auth.linkIdentity。Manual linkingが無効だとエラーになるので、その旨を出す）
 * すべての機能フラグがOFFなら何も表示しない。
 */
export function LineNotifySection() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { openAddFriend } = useLineFriendPrompt();
  const [link, setLink] = useState<LineLinkRow | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- line_user_links は型生成前（別マイグレーションで作成）
    (supabase as any)
      .from("line_user_links")
      .select("notify_enabled, friend_added")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: LineLinkRow | null }) => {
        if (!cancelled) setLink(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setLink(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!LINE_OA_BASIC_ID && !ENABLE_LINE_LOGIN && !ENABLE_APPLE_LOGIN) return null;

  const toggleNotify = async (checked: boolean) => {
    if (!user?.id) return;
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- line_user_links は型生成前（別マイグレーションで作成）
    const { error } = await (supabase as any)
      .from("line_user_links")
      .update({ notify_enabled: checked })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error(t("lineConnect.settings.linkFailed"));
      return;
    }
    setLink((prev) => (prev ? { ...prev, notify_enabled: checked } : prev));
  };

  const handleLinkIdentity = async (provider: string) => {
    try {
      // 型定義にカスタムプロバイダが無いため any で呼ぶ（LINEは custom:line のようなOAuth2手動設定のプロバイダ）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.auth as any).linkIdentity({
        provider,
        options: { redirectTo: `${window.location.origin}/login` },
      });
      if (error) throw error;
    } catch (e) {
      console.error("linkIdentity failed:", e);
      toast.error(t("lineConnect.settings.linkDisabled"));
    }
  };

  return (
    <section className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <p className="text-sm font-medium">{t("lineConnect.settings.sectionTitle")}</p>

      {LINE_OA_BASIC_ID && (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{t("lineConnect.settings.notifyLabel")}</p>
            <p className="text-xs text-muted-foreground">{t("lineConnect.settings.notifyDesc")}</p>
          </div>
          {link ? (
            <Switch checked={link.notify_enabled} disabled={saving} onCheckedChange={toggleNotify} />
          ) : (
            <Button size="sm" variant="outline" onClick={openAddFriend} className="shrink-0">
              {t("lineConnect.settings.connectCta")}
            </Button>
          )}
        </div>
      )}

      {(ENABLE_LINE_LOGIN || ENABLE_APPLE_LOGIN) && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium">{t("lineConnect.settings.linkIdentityTitle")}</p>
          <p className="text-2xs text-muted-foreground">{t("lineConnect.settings.linkIdentityDesc")}</p>
          <div className="flex gap-2">
            {ENABLE_LINE_LOGIN && (
              <Button size="sm" variant="outline" onClick={() => handleLinkIdentity(LINE_AUTH_PROVIDER)}>
                {t("lineConnect.settings.linkLine")}
              </Button>
            )}
            {ENABLE_APPLE_LOGIN && (
              <Button size="sm" variant="outline" onClick={() => handleLinkIdentity("apple")}>
                {t("lineConnect.settings.linkApple")}
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
