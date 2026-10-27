import { useState } from "react";
import { Camera, Check, Megaphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  useSubmitCatalogRequest,
  type CatalogRequestContext,
  type CatalogRequestKind,
} from "@/hooks/useCatalogRequests";
import { cn } from "@/lib/utils";
import { pockeCheer } from "@/components/pocke/pockeCheer";

interface CatalogRequestButtonProps {
  /** 検索語。空ならボタンを出さない */
  query: string;
  context: CatalogRequestContext;
  kind?: CatalogRequestKind;
  /** ログイン済みのときだけ、横に「写真から登録」導線を並べる */
  onPhoto?: () => void;
  className?: string;
}

/**
 * カタログ検索で0件だったときの「『◯◯』を追加してほしい」ボタン。
 * ゲスト（未ログイン）でも送れる（catalog_requests のRLSが user_id null を許す）。
 */
export function CatalogRequestButton({ query, context, kind = "content", onPhoto, className }: CatalogRequestButtonProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const submit = useSubmitCatalogRequest();
  const trimmed = query.trim();

  if (!trimmed) return null;

  const handleClick = async () => {
    try {
      await submit.mutateAsync({ query: trimmed, kind, context });
      setSent(true);
      // 送れた・送れなかったはポッケが一言で伝える（トーストは出さない）
      pockeCheer("catalogAddRequested");
    } catch (e) {
      console.error("catalog request failed:", e);
      pockeCheer("catalogRequestFailed", undefined, "failed");
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={submit.isPending || sent}
        onClick={handleClick}
        className="gap-1.5"
      >
        {sent ? <Check className="h-3.5 w-3.5" /> : <Megaphone className="h-3.5 w-3.5" />}
        {sent ? t("catalogRequest.sent") : t("catalogRequest.cta", { query: trimmed })}
      </Button>
      {user && onPhoto && (
        <button
          type="button"
          onClick={onPhoto}
          className="flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2"
        >
          <Camera className="h-3 w-3" aria-hidden="true" />
          {t("catalogRequest.photoLink")}
        </button>
      )}
    </div>
  );
}
