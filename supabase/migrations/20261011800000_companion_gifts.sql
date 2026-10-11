-- 相棒グッズに「プレゼントを贈る」（ポイントでなかよし度を上げる）と、
-- プロフィールで相棒を他の人にも見せる。
--
-- 以前はなかよし度（xp）が「撫でる +1 / 磨く +1 / 撮る +3」の1日最大 5xp でしか増えず、
-- Lv.10（150xp）まで最短でも30日かかった。ポイントの使いみちとして、プレゼントでも上げられるようにする。
-- ただし毎日のお世話の意味がなくならないよう、プレゼントは「相棒ごと・種類ごと・1日（日本時間）の回数」に上限を置く。
--
-- 値段・xp・回数はクライアントから受け取らず、この表だけを正とする（改ざんされても安くならない）。
--  ・おやつ          30pt → +3xp、1日3回まで
--  ・特別なプレゼント 100pt → +12xp、1日1回まで
-- 1日の連続ログインボーナスが 10〜50pt なので、おやつ1つ ≒ ログイン1〜3日ぶん。
-- まとめ買いの「特別」は 1xp あたり少し安い（おやつ 10pt/xp・特別 約8.3pt/xp）。
-- 毎日ぜんぶ贈っても 190pt / +21xp で、Lv.5・Lv.10 の到達ボーナス（+5pt / +10pt）では元が取れない（ポイントを増やす抜け道にならない）。

CREATE TABLE IF NOT EXISTS public.companion_gift_kinds (
  kind text PRIMARY KEY,
  label text NOT NULL,
  price integer NOT NULL CHECK (price > 0),
  xp integer NOT NULL CHECK (xp > 0),
  daily_limit integer NOT NULL CHECK (daily_limit > 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.companion_gift_kinds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.companion_gift_kinds FROM anon, authenticated;
GRANT SELECT ON public.companion_gift_kinds TO anon, authenticated;
CREATE POLICY companion_gift_kinds_select ON public.companion_gift_kinds FOR SELECT USING (true);

INSERT INTO public.companion_gift_kinds (kind, label, price, xp, daily_limit, sort_order) VALUES
  ('snack',   'おやつ',           30,  3, 3, 1),
  ('special', '特別なプレゼント', 100, 12, 1, 2)
ON CONFLICT (kind) DO NOTHING;

-- 贈った記録（1日の回数を数えるため）。書き込みは give_companion_gift だけ
CREATE TABLE IF NOT EXISTS public.companion_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_item_id uuid NOT NULL REFERENCES public.user_items(id) ON DELETE CASCADE,
  kind text NOT NULL REFERENCES public.companion_gift_kinds(kind),
  points_spent integer NOT NULL CHECK (points_spent > 0),
  xp_gained integer NOT NULL CHECK (xp_gained > 0),
  given_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Tokyo')::date),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS companion_gifts_user_item_day_idx ON public.companion_gifts (user_id, user_item_id, given_on);
ALTER TABLE public.companion_gifts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.companion_gifts FROM anon, authenticated;
GRANT SELECT ON public.companion_gifts TO authenticated;
CREATE POLICY companion_gifts_select ON public.companion_gifts FOR SELECT TO authenticated USING (user_id = auth.uid());
