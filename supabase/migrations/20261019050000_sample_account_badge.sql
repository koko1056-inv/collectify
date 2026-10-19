-- 公式サンプルアカウント（運営のシミュレーターが動かすデモ用アカウント）を
-- 正直に見分けられるようにする。
--
-- 1) profiles.is_sample フラグ
-- 2) サンプルアカウントのユーザー名レジストリ（service_role / マイグレーションのみ書込可）
-- 3) レジストリに載っているユーザー名は自動でフラグが立ち、それ以外は本人も含めて
--    誰も is_sample を書き換えられないようにするトリガー

-- ---------------------------------------------------------------------------
-- 1. is_sample 列
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

-- 通常ユーザーは is_admin と同様、自分では書き換えられない列にする
REVOKE UPDATE (is_sample) ON public.profiles FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. サンプルアカウントのユーザー名レジストリ
--    のちにサインアップしてくる予約済みのサンプルアカウントも拾えるよう、
--    トリガーからのみ参照する台帳。anon/authenticated には一切の権限を与えない。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sample_account_usernames (
  username text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sample_account_usernames ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sample_account_usernames FROM anon, authenticated;

INSERT INTO public.sample_account_usernames (username) VALUES
  ('airix'), ('akizora87'), ('ame'), ('amidolabo78'), ('anya_waku'),
  ('aoi_tora'), ('aotonatsu_numa'), ('atlantis'), ('bakugo_kacchan'), ('botan'),
  ('box-himawari'), ('cabinet_nagi'), ('camp_hana'), ('chopper43'), ('cinna_milkcafe'),
  ('closet_matcha'), ('coco2'), ('coco2z'), ('corner-kamome'), ('dance_tsukimi'),
  ('diary_kesera7'), ('donguri'), ('enst_hokuto'), ('erulog88'), ('fan_wata'),
  ('fanfjord'), ('frieren_tabi'), ('fuwa_harepare'), ('fuyu'), ('hachiware_mogu'),
  ('hagu'), ('hako-yui5'), ('hall_window2'), ('haru'), ('hiloto8'),
  ('hina'), ('hiyoko'), ('hokkoripark'), ('hoku_oshi'), ('hoshikuzu'),
  ('ichigo26'), ('ika'), ('inferno-story9z'), ('inumaki_diary0'), ('jam'),
  ('kaede_ichigo'), ('kageyama_toss'), ('karasu'), ('kiiro_shelf'), ('kira6'),
  ('koara6'), ('kobato_stock'), ('korokoronest14'), ('kosumosbotan'), ('kota'),
  ('kotekotechiyo'), ('kujira'), ('kuriimu'), ('kurimanju_nomu'), ('kuro'),
  ('kuromi_dayo'), ('kurumi'), ('kuzuha_oshi_ren'), ('lilac_tsubaki18'), ('magic5'),
  ('mao-renge'), ('marine_ahoy_3'), ('matcha_yuzu'), ('megu_tsumiki'), ('mga0'),
  ('midori5'), ('mikan-base0'), ('mimi'), ('mio'), ('mofu3x'),
  ('mogura'), ('momo75'), ('motokizukan'), ('mrs_green_jam'), ('nagi_lazy10'),
  ('nagomi'), ('nana'), ('nikonikostage3'), ('noriz'), ('note_nokko'),
  ('nozomi'), ('numamomo'), ('okashi62'), ('pafe-neko'), ('panda'),
  ('pero_ajisai6'), ('piccolocamp57'), ('pocket_mochi'), ('pokacamp0'), ('pokopoko'),
  ('powersumire'), ('purin7'), ('pyon-ginnan'), ('rengoku_umai'), ('renringo4'),
  ('riku-yozora40'), ('ringojam-asahi'), ('ruby_hoshino_b'), ('ruri_log'), ('ryoka_nemu'),
  ('ryotasuzume17'), ('same2-harbor'), ('sana-choco'), ('satoru_6eyes'), ('senbei'),
  ('shiropocket'), ('shizuku-days'), ('shoga'), ('sorakoya'), ('soranji'),
  ('sota'), ('soyo'), ('suisei_comet'), ('suzume3'), ('tako'),
  ('tama2'), ('tamakoya'), ('tampopo'), ('tanurin'), ('tonton6'),
  ('tori'), ('tripharuno10'), ('usagi_yaha'), ('usagix'), ('vault-usa'),
  ('wagashi'), ('wata_fuqurou'), ('wave_matcha'), ('yamato9'), ('yoru_botan'),
  ('yoruhato'), ('yuuhi'), ('zenjin'), ('zoro_maigo'), ('zukanokashi')
ON CONFLICT (username) DO NOTHING;

-- 既存プロフィールのバックフィル
UPDATE public.profiles
   SET is_sample = true
 WHERE lower(username) IN (SELECT username FROM public.sample_account_usernames)
   AND is_sample IS DISTINCT FROM true;

-- ---------------------------------------------------------------------------
-- 3. レジストリ連動トリガー
--    - レジストリに載っているユーザー名なら、INSERT/UPDATE を問わず is_sample = true を強制する
--      （サインアップがレジストリ登録より後でも自動で付く）
--    - それ以外は、service_role 以外の呼び出し元が is_sample を書き換えても無視する
--      （UPDATE なら OLD の値を維持、INSERT なら false のまま）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_profile_is_sample()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.username IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.sample_account_usernames s
     WHERE s.username = lower(NEW.username)
  ) THEN
    NEW.is_sample := true;
  ELSIF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.is_sample := OLD.is_sample;
    ELSE
      NEW.is_sample := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_profile_is_sample() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER profiles_enforce_is_sample
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_is_sample();
