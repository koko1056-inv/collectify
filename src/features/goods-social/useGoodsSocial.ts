import { useInfiniteQuery, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * グッズ起点の交流（持ってる人・ほしい人・交換できるかも）のデータ。
 *
 * どれも SECURITY DEFINER の RPC（supabase/migrations/20261029233000_goods_social.sql）から読む。
 * 非公開・フォロワー限定（フォローしていない）・「グッズのページに表示しない」・ブロック関係の人は、
 * サーバー側で一覧から外れている（人数には名前なしで入る）。
 */

export type GoodsPeopleKind = "owners" | "wishers";

export interface GoodsFace {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface GoodsPeopleSummary {
  owners_count: number;
  wishers_count: number;
  for_trade_count: number;
  /** 一覧に名前が出る人数（自分・名前を出さない人・ブロック関係を除く）。ゲストは 0 */
  owners_listed: number;
  wishers_listed: number;
  owner_faces: GoodsFace[];
  wisher_faces: GoodsFace[];
  me_owns: boolean;
  me_wishes: boolean;
  me_for_trade: boolean;
}

export interface GoodsPerson {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_sample: boolean;
  /** 持ってる数（ほしい人の一覧では null） */
  quantity: number | null;
  for_trade: boolean;
  /** 交換を申し込むときの宛先（その人のこのグッズ。交換に出している 1 点が優先） */
  trade_item_id: string | null;
  /** 同じ作品のグッズを何個持っているか（作品がわからないグッズでは null） */
  series_count: number | null;
  is_following: boolean;
  added_at: string;
}

export interface GoodsTradeCandidate {
  /** want_from: 自分がほしい → 相手が交換に出している / offer_to: 自分が交換に出している → 相手がほしい */
  direction: "want_from" | "offer_to";
  partner_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  /** 申し込むときの相手の品。offer_to で相手が何も交換に出していないときは null */
  partner_item_id: string | null;
  partner_item_title: string | null;
  partner_item_image: string | null;
  my_item_id: string | null;
}

export const GOODS_PEOPLE_PAGE = 20;

/** グッズの人数・一覧・交換候補のキーの頭。登録・ほしい・交換に出す の後にまとめて引き直す */
export const goodsPeopleKey = (itemId: string | null | undefined) => ["goods-people", itemId] as const;

export function invalidateGoodsPeople(queryClient: QueryClient, itemId?: string | null) {
  return queryClient.invalidateQueries({
    queryKey: itemId ? goodsPeopleKey(itemId) : ["goods-people"],
  });
}

// 型定義には載せているが、マイグレーションがまだ当たっていない環境では関数が無い。そのときは静かに「なし」にする
function isMissingFunction(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST202" || error.code === "42883" || /could not find the function/i.test(error.message ?? "")
  );
}

const EMPTY_SUMMARY: GoodsPeopleSummary = {
  owners_count: 0,
  wishers_count: 0,
  for_trade_count: 0,
  owners_listed: 0,
  wishers_listed: 0,
  owner_faces: [],
  wisher_faces: [],
  me_owns: false,
  me_wishes: false,
  me_for_trade: false,
};

/** 人数と先頭のアイコン（1 回の RPC）。ゲストは人数だけ。関数が無い環境では null（行ごと出さない） */
export function useGoodsPeopleSummary(itemId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...goodsPeopleKey(itemId), "summary", user?.id ?? null],
    enabled: !!itemId,
    staleTime: 60_000,
    meta: { silentError: true },
    queryFn: async (): Promise<GoodsPeopleSummary | null> => {
      const { data, error } = await supabase.rpc("get_goods_people_summary", {
        _item_id: itemId!,
      });
      if (error) {
        if (isMissingFunction(error)) return null;
        throw error;
      }
      return {
        ...EMPTY_SUMMARY,
        ...((data ?? {}) as Partial<GoodsPeopleSummary>),
      };
    },
  });
}

/** 持ってる人・ほしい人の一覧（20 人ずつ）。ログインしている人だけ */
export function useGoodsPeople(itemId: string | null | undefined, kind: GoodsPeopleKind, enabled = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useInfiniteQuery({
    queryKey: [...goodsPeopleKey(itemId), "list", kind, user?.id ?? null],
    enabled: !!itemId && !!user && enabled,
    staleTime: 60_000,
    meta: { silentError: true },
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<{ people: GoodsPerson[]; next: number | null }> => {
      const { data, error } = await supabase.rpc("get_goods_people", {
        _item_id: itemId!,
        _kind: kind,
        _limit: GOODS_PEOPLE_PAGE,
        _offset: pageParam,
      });
      if (error) throw error;
      const people = (data ?? []) as GoodsPerson[];
      // 一覧に出したフォローボタン（InlineFollowButton）が 1 人ずつ問い合わせないよう、フォロー状態を先に入れておく
      if (user) {
        for (const p of people) {
          const key = ["following", user.id, p.user_id];
          if (queryClient.getQueryData(key) === undefined) queryClient.setQueryData(key, p.is_following);
        }
      }
      return {
        people,
        next: people.length === GOODS_PEOPLE_PAGE ? pageParam + GOODS_PEOPLE_PAGE : null,
      };
    },
    getNextPageParam: (last) => last.next,
  });
}

/** 「交換できるかも」。自分がほしい／交換に出しているときだけ相手が見つかる。ログインしている人だけ */
export function useGoodsTradeCandidates(itemId: string | null | undefined, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...goodsPeopleKey(itemId), "trade", user?.id ?? null],
    enabled: !!itemId && !!user && enabled,
    staleTime: 60_000,
    meta: { silentError: true },
    queryFn: async (): Promise<GoodsTradeCandidate[]> => {
      const { data, error } = await supabase.rpc("get_goods_trade_candidates", {
        _item_id: itemId!,
        _limit: 6,
      });
      if (error) {
        if (isMissingFunction(error)) return [];
        throw error;
      }
      return (data ?? []) as GoodsTradeCandidate[];
    },
  });
}

/** 設定「グッズのページに自分を表示する」 */
export const goodsVisibilityKey = (userId: string | undefined) => ["goods-visibility", userId] as const;

export function useGoodsVisibility() {
  const { user } = useAuth();
  return useQuery({
    queryKey: goodsVisibilityKey(user?.id),
    enabled: !!user,
    meta: { silentError: true },
    queryFn: async (): Promise<boolean | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("show_on_goods_pages")
        .eq("id", user!.id)
        .maybeSingle();
      // 列がまだ無い環境（マイグレーション前）では設定を出さない
      if (error) return null;
      return data?.show_on_goods_pages ?? true;
    },
  });
}
