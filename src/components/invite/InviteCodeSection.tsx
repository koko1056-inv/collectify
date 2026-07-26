import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInviteCode } from "@/hooks/useInviteCode";
import { Copy, Gift, Users, Ticket, Share2 } from "lucide-react";
import { toast } from "sonner";
import { buildInviteShareText, buildInviteUrl } from "@/utils/shareLinks";
import { useLanguage } from "@/contexts/LanguageContext";

export function InviteCodeSection() {
  const { t } = useLanguage();
  const { myCodes, referralCount, createCode, redeemCode } = useInviteCode();
  const [redeemInput, setRedeemInput] = useState("");

  const unusedCodes = myCodes.filter((c) => !c.used_by);
  const latestCode = unusedCodes[0];

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(buildInviteShareText(code));
    toast.success(t("misc.invite.linkCopied"));
  };

  const handleShare = async (code: string) => {
    const text = buildInviteShareText(code);
    const url = buildInviteUrl(code);
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch {
        // キャンセル等
      }
    }
    navigator.clipboard.writeText(text);
    toast.success(t("misc.invite.linkCopied"));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Gift className="w-5 h-5 text-primary" />
        {t("misc.invite.title")}
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{t("misc.invite.invitedCount", { n: referralCount })}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Ticket className="w-4 h-4" />
          <span>{t("misc.invite.unusedCodes", { n: unusedCodes.length })}</span>
        </div>
      </div>

      {/* Generate / Show code */}
      {latestCode ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-lg tracking-widest text-center">
              {latestCode.code}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopy(latestCode.code)}
              title={t("misc.invite.copyLink")}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              onClick={() => handleShare(latestCode.code)}
              title={t("misc.invite.share")}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t("misc.invite.inviteLink", { url: buildInviteUrl(latestCode.code) })}
          </p>
        </div>
      ) : null}

      <Button
        onClick={() => createCode.mutate()}
        disabled={createCode.isPending}
        className="w-full bg-gradient-to-r from-primary to-primary/70 hover:from-primary/90 hover:to-primary/60"
      >
        <Gift className="w-4 h-4 mr-2" />
        {t("misc.invite.createCode")}
      </Button>

      <p className="text-xs text-muted-foreground">
        {t("misc.invite.bonusNote")}
      </p>

      {/* Redeem section */}
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-sm font-medium mb-2">{t("misc.invite.enterCode")}</p>
        <div className="flex gap-2">
          <Input
            placeholder={t("misc.invite.codePlaceholder")}
            value={redeemInput}
            onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
            maxLength={8}
            className="font-mono tracking-widest"
          />
          <Button
            variant="outline"
            onClick={() => {
              if (redeemInput.length === 8) {
                redeemCode.mutate(redeemInput);
                setRedeemInput("");
              } else {
                toast.error(t("misc.invite.codeLengthError"));
              }
            }}
            disabled={redeemCode.isPending || redeemInput.length !== 8}
          >
            {t("misc.invite.apply")}
          </Button>
        </div>
      </div>
    </div>
  );
}
