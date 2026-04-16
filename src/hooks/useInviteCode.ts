import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
      toast.success(`招待コードを作成しました: ${data.code}`);
    },
    onError: () => toast.error("招待コードの作成に失敗しました"),
  });

  // Redeem an invite code
  const redeemCode = useMutation({
    mutationFn: async (code: string) => {
      if (!user?.id) throw new Error("Not logged in");

      // Find the code
      const { data: invite, error: findError } = await supabase
        .from("invite_codes")
        .select("*")
        .eq("code", code.toUpperCase())
        .is("used_by", null)
        .single();

      if (findError || !invite) throw new Error("無効な招待コードです");
      if (invite.creator_id === user.id)
        throw new Error("自分の招待コードは使えません");
      if (invite.expires_at && new Date(invite.expires_at) < new Date())
        throw new Error("招待コードの有効期限が切れています");

      // Mark as used
      const { error: updateError } = await supabase
        .from("invite_codes")
        .update({ used_by: user.id, used_at: new Date().toISOString() })
        .eq("id", invite.id);

      if (updateError) throw updateError;

      // Set referred_by on profile
      await supabase
        .from("profiles")
        .update({ referred_by: invite.creator_id })
        .eq("id", user.id);

      // Award bonus points to both users (50 points each)
      const bonusPoints = 50;
      await supabase.from("point_transactions").insert([
        {
          user_id: invite.creator_id,
          amount: bonusPoints,
          type: "referral_bonus",
          description: "招待ボーナス",
        },
        {
          user_id: user.id,
          amount: bonusPoints,
          type: "referral_bonus",
          description: "招待コード使用ボーナス",
        },
      ]);

      return invite;
    },
    onSuccess: () => {
      toast.success("招待コードを適用しました！50ポイント獲得！");
      qc.invalidateQueries({ queryKey: ["user-points"] });
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
