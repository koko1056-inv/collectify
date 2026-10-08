import { useState } from "react";
import { CheckCircle2, Share, SquarePlus, Smartphone, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const DISMISSED_KEY = "collectify.installPrompt.dismissedAt";
const DISMISS_DAYS = 14;

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return !!at && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

// LINE・Instagram などのアプリ内ブラウザは、ホーム画面への追加ができない
const inAppBrowser = () => /Line\/|FBAN|FBAV|Instagram|Twitter|MicroMessenger/i.test(navigator.userAgent);

interface InstallAppCardProps {
  /** banner: 閉じられる案内（インストール済みなら出さない） / section: 設定画面の常設の行 */
  variant: "banner" | "section";
}

/**
 * 「アプリとして使う」案内。
 *  Android・PC の Chrome は、ボタンひとつでインストールする。
 *  iPhone / iPad はブラウザからインストールを呼べないので、手順を見せる。
 */
export function InstallAppCard({ variant }: InstallAppCardProps) {
  const { t } = useLanguage();
  const { state, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => (variant === "banner" ? recentlyDismissed() : false));
  const [iosOpen, setIosOpen] = useState(false);

  // 案内（banner）は、入れられるときだけ出す
  if (variant === "banner" && (state === "installed" || state === "unavailable" || dismissed)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      /* 記憶できなくても、この画面では閉じる */
    }
    setDismissed(true);
  };

  const handleInstall = async () => {
    const result = await promptInstall();
    if (result === "accepted") toast.success(t("pwa.accepted"));
  };

  const action =
    state === "can-prompt" ? (
      <Button size="sm" className="shrink-0 rounded-full" onClick={handleInstall}>
        {t("pwa.install")}
      </Button>
    ) : state === "ios-manual" ? (
      <Button size="sm" className="shrink-0 rounded-full" onClick={() => setIosOpen(true)}>
        {t("pwa.howTo")}
      </Button>
    ) : null;

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
        {state === "installed" ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        ) : (
          <Smartphone className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{state === "installed" ? t("pwa.installed") : t("pwa.title")}</p>
          <p className="text-xs text-muted-foreground">
            {state === "installed" ? t("pwa.installedDesc") : state === "unavailable" ? t("pwa.unavailable") : t("pwa.desc")}
          </p>
        </div>
        {action}
        {variant === "banner" && (
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("pwa.later")}
            className="-mr-1 shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("pwa.iosTitle")}</DialogTitle>
            <DialogDescription>{t("pwa.desc")}</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Share className="h-4 w-4" aria-hidden />
              </span>
              {t("pwa.iosStep1")}
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <SquarePlus className="h-4 w-4" aria-hidden />
              </span>
              {t("pwa.iosStep2")}
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              </span>
              {t("pwa.iosStep3")}
            </li>
          </ol>
          {inAppBrowser() && <p className="text-xs text-muted-foreground">{t("pwa.iosInApp")}</p>}
          <Button variant="outline" onClick={() => setIosOpen(false)}>
            {t("pwa.close")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
