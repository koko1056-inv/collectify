import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TradeMatchItem {
  id: string;
  title: string;
  image: string;
}

export interface TradeMatch {
  partner_id: string;
  partner_username: string | null;
  partner_avatar_url: string | null;
  /** 両想い。相手の出しているものが欲しくて、相手も自分の出しているものを欲しがっている */
  is_mutual: boolean;
  /** 相手が交換に出していて、自分が欲しいもの */
  their_items: TradeMatchItem[];
  /** 自分が交換に出していて、相手が欲しいもの */
  my_items: TradeMatchItem[];
}

/** jsonb で返ってくるので、配列以外が来ても落ちないようにしておく */
function toItems(value: unknown): TradeMatchItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is TradeMatchItem =>
      !!v && typeof v === "object" && typeof (v as TradeMatchItem).id === "string"
  );
}

/**
 * 交換相手の候補。
 *
 * 突き合わせはサーバー側の find_trade_matches に任せている。
 * 以前はブラウザで最大5000行を引いて総当たりしていたが、
 * 件数が増えると成立しないうえ、「相手も自分のものを欲しがっているか」を
 * 見ていなかったので、片想いばかりが並んでいた。
 */
export function useTradeMatches() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trade-matches", user?.id],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<TradeMatch[]> => {
      const { data, error } = await supabase.rpc("find_trade_matches", { _limit: 30 });
      if (error) throw error;

      return (data ?? []).map((row) => ({
        partner_id: row.partner_id,
        partner_username: row.partner_username,
        partner_avatar_url: row.partner_avatar_url,
        is_mutual: row.is_mutual,
        their_items: toItems(row.their_items),
        my_items: toItems(row.my_items),
      }));
    },
  });
}

/**
 * マッチが出ない理由を切り分けるための材料。
 * ウィッシュが空なのか、交換に出しているグッズが無いのかで案内を変える。
 */
export function useTradeReadiness() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trade-readiness", user?.id],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [wish, offers, surplus] = await Promise.all([
        supabase
          .from("wishlists")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id),
        supabase
          .from("user_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("for_trade", true),
        // 2つ以上持っているグッズ。「交換に出すものが無い」と言われても、
        // 実際にはダブっているものがあることが多い。それを名指しできるようにする。
        supabase
          .from("user_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("for_trade", false)
          .gte("quantity", 2),
      ]);

      if (wish.error) throw wish.error;
      if (offers.error) throw offers.error;
      if (surplus.error) throw surplus.error;

      return {
        wishCount: wish.count ?? 0,
        offerCount: offers.count ?? 0,
        surplusCount: surplus.count ?? 0,
      };
    },
  });
}

export interface TradeSeriesPartner {
  partner_id: string;
  partner_username: string | null;
  partner_avatar_url: string | null;
  /** 自分と重なっている作品名 */
  shared_series: string[];
  /** 相手がその作品で交換に出しているもの */
  their_items: TradeMatchItem[];
}

/**
 * 同じ作品を集めている相手。
 *
 * find_trade_matches はグッズの完全一致でしか突き合わせないが、推し活の交換は
 * 「同じ作品の別キャラ」が中心で、その条件では現実のデータでほぼ成立しない
 * （本番で、仮に全件を交換可にしても片想い3組・両想い0組だった）。
 * 作品名で緩く寄せた候補を、完全一致マッチの下に別枠で出すための材料。
 */
export function useTradeSeriesPartners() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trade-series-partners", user?.id],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<TradeSeriesPartner[]> => {
      const { data, error } = await supabase.rpc("find_trade_series_partners", { _limit: 20 });
      if (error) throw error;

      return (data ?? []).map((row) => ({
        partner_id: row.partner_id,
        partner_username: row.partner_username,
        partner_avatar_url: row.partner_avatar_url,
        shared_series: Array.isArray(row.shared_series) ? row.shared_series : [],
        their_items: toItems(row.their_items),
      }));
    },
  });
}

export interface MyTradeOffer {
  id: string;
  title: string;
  image: string;
  quantity: number;
}

/**
 * 自分が交換に出しているグッズ。
 * 交換タブに「出したものが見える場所」が無いと、選んだ直後に何も変わらず、
 * 保存されたのか分からない。マッチが無いうちも、出しているものはここで見せる。
 */
export function useMyTradeOffers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-trade-offers", user?.id],
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<MyTradeOffer[]> => {
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image, quantity")
        .eq("user_id", user!.id)
        .eq("for_trade", true)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as MyTradeOffer[];
    },
  });
}

export interface WishHolder {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  /** 相手が持っているそのグッズ（user_items の id）。申請の宛先になる */
  user_item_id: string;
  /** 相手が「交換に出す」にしているか。出していなくても申請はできる */
  for_trade: boolean;
  quantity: number;
  trade_score: number;
  trade_count: number;
  /** 自分がすでに申請を出していて、返事待ち／進行中 */
  already_requested: boolean;
  /** 別の交換が成立していて、いまは申請できない */
  busy: boolean;
}

export interface WishWithHolders {
  wish_id: string;
  official_item_id: string;
  title: string;
  image: string;
  content_name: string | null;
  holder_count: number;
  trade_ok_count: number;
  holders: WishHolder[];
}

/**
 * 自分の「欲しい」を持っている人。
 *
 * find_trade_matches は「相手が交換に出している」ものしか拾わないので、
 * 出している人がまだ少ないうちはほとんど何も出ない。
 * ここは、出しているかどうかに関わらず「持っている人」を欲しいもの単位で見せて、
 * そこから申請（相談）まで進めるための材料。
 */
export function useHoldersForMyWishes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trade-holders", user?.id],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<WishWithHolders[]> => {
      const { data, error } = await supabase.rpc("find_holders_for_my_wishes", { _limit: 40 });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        wish_id: row.wish_id,
        official_item_id: row.official_item_id,
        title: row.title,
        image: row.image,
        content_name: row.content_name,
        holder_count: row.holder_count,
        trade_ok_count: row.trade_ok_count,
        holders: Array.isArray(row.holders) ? (row.holders as unknown as WishHolder[]) : [],
      }));
    },
  });
}

export interface TradePartnerItem {
  id: string;
  title: string;
  image: string;
  /** 相手が「交換に出す」にしているか。出していない品への申し込みは相談になる */
  for_trade: boolean;
  /** 自分がすでに申し込んでいて、返事待ち／進行中 */
  already_requested: boolean;
}

type PartnerItemRow = {
  partner_id: string;
  item_id: string;
  title: string;
  image: string;
  for_trade: boolean;
  already_requested: boolean;
};

function toPartnerItem(row: PartnerItemRow): TradePartnerItem {
  return {
    id: row.item_id,
    title: row.title,
    image: row.image,
    for_trade: row.for_trade,
    already_requested: row.already_requested,
  };
}

/**
 * 相手たちが交換に出している品（相手ごと）。
 *
 * 「あなたのグッズをほしがっている人」は、find_trade_matches の their_items が空
 * （相手が出している品に、自分の欲しいものが無い）なので、
 * 代わりに何をもらえるのかが分からず、行き止まりになっていた。
 * 相手が交換に出している品を全員分まとめて1回で引き、「代わりにもらえるもの」として見せる。
 * 別の交換で成立済みの品はサーバー側で除いている。
 */
export function useTradePartnerOffers(partnerIds: string[]) {
  const { user } = useAuth();
  const ids = [...new Set(partnerIds)].sort();

  return useQuery({
    queryKey: ["trade-partner-offers", user?.id, ids.join(",")],
    enabled: !!user?.id && ids.length > 0,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Record<string, TradePartnerItem[]>> => {
      const { data, error } = await supabase.rpc("get_trade_partner_items", {
        _partner_ids: ids,
        _only_for_trade: true,
      });
      if (error) throw error;
      const byPartner: Record<string, TradePartnerItem[]> = {};
      for (const row of (data ?? []) as PartnerItemRow[]) {
        (byPartner[row.partner_id] ??= []).push(toPartnerItem(row));
      }
      return byPartner;
    },
  });
}

/**
 * 相手のコレクション全体（交換に出していない品も含む）。
 * 相手が何も交換に出していないとき、そこから選んで「相談」として申し込むために使う。
 * 公開設定とブロックはサーバー側で守る。
 */
export function usePartnerCollection(partnerId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trade-partner-collection", user?.id, partnerId],
    enabled: !!user?.id && !!partnerId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<TradePartnerItem[]> => {
      const { data, error } = await supabase.rpc("get_trade_partner_items", {
        _partner_ids: [partnerId!],
        _only_for_trade: false,
      });
      if (error) throw error;
      return ((data ?? []) as PartnerItemRow[]).map(toPartnerItem);
    },
  });
}
