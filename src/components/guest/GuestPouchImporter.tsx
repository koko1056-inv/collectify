import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addManyToCollection } from "@/utils/collection-actions";
import { invalidateCollectionChanged } from "@/utils/collection-cache";
import { clearGuestPouch, readGuestPouch } from "@/utils/guestPouch";
import { pockeCheer } from "@/components/pocke/pockeCheer";

/**
 * ログインなしで試した「おためしの袋」を、登録（ログイン）したらコレクションへ移す係（App に1つ）。
 * 持っているもの → コレクション、ハートを付けたもの → ほしいものリスト。もう持っているものは除く。
 * 移せたら袋を空にする（失敗したら残して、次に開いたときにもう一度試す）
 */
export function GuestPouchImporter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const running = useRef(false);

  useEffect(() => {
    if (!user || running.current) return;
    const pouch = readGuestPouch();
    if (pouch.owned.length === 0 && pouch.wished.length === 0) return;
    running.current = true;
    void (async () => {
      try {
        let added = 0;
        if (pouch.owned.length > 0) {
          const result = await addManyToCollection(
            user.id,
            pouch.owned.map((i) => ({
              officialItemId: i.id,
              title: i.title,
              image: i.image,
              contentName: i.content_name ?? undefined,
              releaseDate: i.release_date ?? undefined,
              prize: i.price ?? undefined,
            }))
          );
          if (!result.success && !result.isAtLimit) throw new Error(result.error ?? "import failed");
          added = result.added;
        }
        if (pouch.wished.length > 0) {
          const { data: existing } = await supabase
            .from("wishlists")
            .select("official_item_id")
            .eq("user_id", user.id)
            .in("official_item_id", pouch.wished.map((i) => i.id));
          const have = new Set((existing ?? []).map((r) => r.official_item_id));
          const rows = pouch.wished
            .filter((i) => !have.has(i.id) && !pouch.owned.some((o) => o.id === i.id))
            .map((i) => ({ user_id: user.id, official_item_id: i.id }));
          if (rows.length > 0) await supabase.from("wishlists").insert(rows);
        }
        clearGuestPouch();
        await invalidateCollectionChanged(queryClient);
        queryClient.invalidateQueries({ queryKey: ["wishlist"] });
        if (added > 0) {
          pockeCheer("addedMany", added);
        }
      } catch (e) {
        console.error("guest pouch import failed", e);
      } finally {
        running.current = false;
      }
    })();
  }, [user, queryClient]);

  return null;
}
