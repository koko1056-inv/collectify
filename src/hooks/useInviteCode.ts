import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * redeem_invite_code が返すエラー識別子を、表示用の文言に変換する。
 * 未知のエラーはそのまま返す（サーバー側の想定外を隠さない）。
 */
function inviteErrorMessage(raw: string | undefined, t: (k: string) => string): string {
  const codes: Record<string, string> = {
    invite_not_found: "notices.invite.invalid",
    invite_own_code: "notices.invite.ownCode",
    invite_expired: "notices.invite.expired",
    invite_already_used: "notices.invite.alreadyUsed",
    invite_already_redeemed: "notices.invite.alreadyRedeemed",
  };
  const key = Object.keys(codes).find((c) => raw?.includes(c));
  return key ? t(codes[key]) : raw || t("notices.invite.invalid");
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function useInviteCode() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t } = useLanguage();
  const key = ["invite-codes", user?.id];

  // Fetch my invite codes
  const { data: myCodes = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("invite_codes")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Count of successful referrals
  const { data: referralCount = 0 } = useQuery({
    queryKey: ["referral-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from("invite_codes")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", user.id)
        .not("used_by", "is", null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Generate a new invite code
  const createCode = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not logged in");
      const code = generateCode();
      const { data, error } = await supabase
        .from("invite_codes")
        .insert({
          code,
          creator_id: user.id,
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(), // 30 days
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: key });
      toast.success(t("notices.invite.created", { code: data.code }));
    },
    onError: () => toast.error(t("notices.invite.createFailed")),
  });

  // Redeem an invite code
  const redeemCode = useMutation({
    mutationFn: async (code: string) => {
      if (!user?.id) throw new Error("Not logged in");

      // 検証・使用済みマーク・双方への付与をサーバー側で原子的に実行する。
      // 招待者は別ユーザーなので、クライアントからは付与できない
      // （以前は add_user_points を直接呼んでいたため、招待者側のボーナスが
      //  「他人のポイントは変更できない」エラーで常に失敗していた）。
      const { error } = await supabase.rpc("redeem_invite_code", {
        _code: code.toUpperCase(),
      });

      if (error) throw new Error(inviteErrorMessage(error.message, t));
    },
    onSuccess: () => {
      toast.success(t("notices.invite.redeemed"));
      qc.invalidateQueries({ queryKey: ["user-points"] });
      qc.invalidateQueries({ queryKey: ["userPoints"] });
      qc.invalidateQueries({ queryKey: ["pointTransactions"] });
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    myCodes,
    referralCount,
    isLoading,
    createCode,
    redeemCode,
  };
}
