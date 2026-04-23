import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInviteCode } from "@/hooks/useInviteCode";
import { Copy, Gift, Users, Ticket, Share2 } from "lucide-react";
import { toast } from "sonner";
import { buildInviteShareText, buildInviteUrl } from "@/utils/shareLinks";

export function InviteCodeSection() {
  const { myCodes, referralCount, createCode, redeemCode } = useInviteCode();
  const [redeemInput, setRedeemInput] = useState("");

  const unusedCodes = myCodes.filter((c) => !c.used_by);
  const latestCode = unusedCodes[0];

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(buildInviteShareText(code));
    toast.success("招待リンクをコピーしました！");
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
    toast.success("招待リンクをコピーしました！");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Gift className="w-5 h-5 text-purple-500" />
        友達を招待
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{referralCount}人を招待済み</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Ticket className="w-4 h-4" />
          <span>未使用コード: {unusedCodes.length}枚</span>
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
              title="リンクをコピー"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              onClick={() => handleShare(latestCode.code)}
              title="シェア"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            招待リンク: {buildInviteUrl(latestCode.code)}
          </p>
        </div>
      ) : null}

      <Button
        onClick={() => createCode.mutate()}
        disabled={createCode.isPending}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
      >
        <Gift className="w-4 h-4 mr-2" />
        新しい招待コードを作成
      </Button>

      <p className="text-xs text-muted-foreground">
        友達が招待コードを使うと、お互いに50ポイントもらえます
      </p>

      {/* Redeem section */}
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-sm font-medium mb-2">招待コードを入力</p>
        <div className="flex gap-2">
          <Input
            placeholder="例: ABCD1234"
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
                toast.error("8文字の招待コードを入力してください");
              }
            }}
            disabled={redeemCode.isPending || redeemInput.length !== 8}
          >
            適用
          </Button>
        </div>
      </div>
    </div>
  );
}
