import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { buildInviteUrl } from "@/utils/shareLinks";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * 共有カードに載せる招待リンクを返す。
 *
 * これまで招待コードは「設定画面で自分で発行する」仕組みだけで、
 * 本番では1件も発行されていなかった（拡散の入口として機能していない）。
 * シェアの瞬間に、未使用で期限内のコードがあればそれを使い、無ければ黙って発行する。
 * 失敗しても共有そのものは止めない（招待なしのURLを返す）。
 */
export function useShareInvite() {
  const { user } = useAuth();

  const getInviteUrl = useCallback(async (): Promise<string> => {
    if (!user?.id) return window.location.origin;
    try {
      const { data: existing } = await supabase
        .from("invite_codes")
        .select("code, expires_at")
        .eq("creator_id", user.id)
        .is("used_by", null)
        .order("created_at", { ascending: false })
        .limit(5);
      const now = Date.now();
      const usable = (existing ?? []).find(
        (c) => !c.expires_at || new Date(c.expires_at).getTime() > now + 24 * 3600 * 1000
      );
      if (usable) return buildInviteUrl(usable.code);

      const code = generateCode();
      const { error } = await supabase.from("invite_codes").insert({
        code,
        creator_id: user.id,
        expires_at: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      return buildInviteUrl(code);
    } catch {
      return window.location.origin;
    }
  }, [user?.id]);

  return { getInviteUrl };
}
