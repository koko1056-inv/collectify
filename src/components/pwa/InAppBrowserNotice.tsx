import { useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { AlertTriangle, Check, Copy, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { useLanguage } from "@/contexts/LanguageContext";
import { isStandalone } from "@/hooks/useInstallPrompt";
import {
  buildAndroidChromeIntentUrl,
  detectInAppBrowser,
  isAndroidUserAgent,
  withInAppMarker,
} from "@/utils/inAppBrowser";
import { cn } from "@/lib/utils";

/**
 * Instagram・LINE・X・Facebook・TikTok などのアプリ内ブラウザで開いているときの案内。
 *
 * アプリ内ブラウザでの登録は、あとでSafari/Chromeを開いたときにログインや
 * 「おためしの袋」の中身が引き継がれないことが多い。閉じれば登録は続けられる
 * （強制はしない）。通常のブラウザ・PWA・Capacitor（ネイティブアプリ）では出さない。
 */
export function InAppBrowserNotice({ className }: { className?: string }) {
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const kind = useMemo(() => detectInAppBrowser(), []);
  const android = useMemo(() => isAndroidUserAgent(), []);
  const markedUrl = useMemo(
    () => (typeof window === "undefined" ? "" : withInAppMarker(window.location.href)),
    []
  );

  if (!kind || dismissed || Capacitor.isNativePlatform() || isStandalone()) return null;

  const isLine = kind === "line";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markedUrl);
      setCopied(true);
      toast.success(t("inAppBrowser.copied"));
    } catch {
      setShowUrl(true);
    }
  };

  return (
    <Card className={cn("border-warning/30 bg-warning-soft", className)}>
      <CardContent className="space-y-2.5 p-3">
        <div className="flex items-start gap-2.5">
          <IconTile tone="warning" size="sm">
            <AlertTriangle />
          </IconTile>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{isLine ? t("inAppBrowser.lineTitle") : t("inAppBrowser.title")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isLine ? t("inAppBrowser.lineDesc") : t("inAppBrowser.desc")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label={t("inAppBrowser.dismiss")}
            className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ol className="list-inside list-decimal space-y-0.5 pl-1 text-xs text-muted-foreground">
          {android ? (
            <>
              <li>{t("inAppBrowser.androidStep1")}</li>
              <li>{t("inAppBrowser.androidStep2")}</li>
            </>
          ) : (
            <>
              <li>{t("inAppBrowser.iosStep1")}</li>
              <li>{t("inAppBrowser.iosStep2")}</li>
            </>
          )}
        </ol>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? t("inAppBrowser.copied") : t("inAppBrowser.copyLink")}
          </Button>
          {android && (
            <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" asChild>
              <a href={buildAndroidChromeIntentUrl(markedUrl)}>
                <ExternalLink className="h-3 w-3" />
                {t("inAppBrowser.openChrome")}
              </a>
            </Button>
          )}
        </div>

        {showUrl && (
          <p className="select-all break-all rounded-lg bg-muted p-2 text-2xs text-muted-foreground">{markedUrl}</p>
        )}
      </CardContent>
    </Card>
  );
}
