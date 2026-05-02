-- =========================================================
-- IAP Integration: Apple In-App Purchase via RevenueCat
-- =========================================================

-- 1. Extend point_packages with Apple/RevenueCat product IDs
-- ---------------------------------------------------------
ALTER TABLE public.point_packages
  ADD COLUMN IF NOT EXISTS apple_product_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS revenuecat_package_id text;

UPDATE public.point_packages SET
  apple_product_id      = 'com.collectify.points.starter',
  revenuecat_package_id = 'starter'
WHERE name = 'お試しパック';

UPDATE public.point_packages SET
  apple_product_id      = 'com.collectify.points.standard',
  revenuecat_package_id = 'standard'
WHERE name = 'スタンダード';

UPDATE public.point_packages SET
  apple_product_id      = 'com.collectify.points.value',
  revenuecat_package_id = 'value'
WHERE name = 'お得パック';

UPDATE public.point_packages SET
  apple_product_id      = 'com.collectify.points.premium',
  revenuecat_package_id = 'premium',
  price                 = 2980  -- Apple price tier ¥2940 unavailable; nearest valid JPY tier is ¥2980
WHERE name = 'プレミアム';

-- 2. IAP transaction ledger
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.iap_transactions (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid        NOT NULL,
  apple_transaction_id  text        NOT NULL UNIQUE,
  revenuecat_event_id   text        UNIQUE,
  product_id            text        NOT NULL,
  points_granted        integer     NOT NULL,
  amount_jpy            integer,
  status                text        NOT NULL DEFAULT 'granted',
  raw_event             jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Indexes: the two columns hit on every webhook call
CREATE INDEX IF NOT EXISTS iap_transactions_user_id_idx
  ON public.iap_transactions (user_id);

CREATE INDEX IF NOT EXISTS iap_transactions_apple_transaction_id_idx
  ON public.iap_transactions (apple_transaction_id);

-- 3. RLS
-- ---------------------------------------------------------
ALTER TABLE public.iap_transactions ENABLE ROW LEVEL SECURITY;

-- Users may read their own rows; INSERT is handled exclusively
-- through the SECURITY DEFINER function below — no direct INSERT
-- policy is granted to authenticated or anon roles.
CREATE POLICY "Users can view their own iap_transactions"
  ON public.iap_transactions
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- 4. Core grant function (SECURITY DEFINER, idempotent)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_points_from_iap(
  _user_id      uuid,
  _apple_tx_id  text,
  _product_id   text,
  _event_id     text,
  _event        jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pkg           record;
  _total_points  integer;
  _new_balance   integer;
  _iap_tx_id     uuid;
BEGIN
  -- ── Idempotency guard ────────────────────────────────────
  -- If this Apple transaction has already been processed,
  -- return immediately without re-granting points.
  IF EXISTS (
    SELECT 1 FROM public.iap_transactions
    WHERE  apple_transaction_id = _apple_tx_id
  ) THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true);
  END IF;

  -- ── Resolve package ──────────────────────────────────────
  SELECT price, points, bonus_points
  INTO   _pkg
  FROM   public.point_packages
  WHERE  apple_product_id = _product_id
    AND  is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success',    false,
      'error',      'unknown_product',
      'product_id', _product_id
    );
  END IF;

  _total_points := _pkg.points + _pkg.bonus_points;

  -- ── Record the IAP transaction ───────────────────────────
  INSERT INTO public.iap_transactions (
    user_id,
    apple_transaction_id,
    revenuecat_event_id,
    product_id,
    points_granted,
    amount_jpy,
    status,
    raw_event
  ) VALUES (
    _user_id,
    _apple_tx_id,
    _event_id,
    _product_id,
    _total_points,
    _pkg.price,
    'granted',
    _event
  )
  RETURNING id INTO _iap_tx_id;

  -- ── Credit user_points (upsert) ──────────────────────────
  -- Insert a new row if the user has no balance record yet;
  -- otherwise add to the existing total_points.
  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_user_id, _total_points)
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_points = public.user_points.total_points + EXCLUDED.total_points,
    updated_at   = now()
  RETURNING total_points INTO _new_balance;

  -- ── Append to point_transactions ledger ──────────────────
  INSERT INTO public.point_transactions (
    user_id,
    points,
    transaction_type,
    description,
    reference_id
  ) VALUES (
    _user_id,
    _total_points,
    'iap_purchase',
    'Apple IAP: ' || _product_id,
    _iap_tx_id
  );

  RETURN jsonb_build_object(
    'success',        true,
    'duplicate',      false,
    'points_granted', _total_points,
    'new_balance',    _new_balance
  );
END;
$$;

-- 5. Restrict execution to service_role only
-- ---------------------------------------------------------
-- Revoke from PUBLIC so no role inherits execute rights,
-- then grant explicitly to service_role (used by the Edge Function).
REVOKE EXECUTE ON FUNCTION public.grant_points_from_iap(uuid, text, text, text, jsonb)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.grant_points_from_iap(uuid, text, text, text, jsonb)
  TO service_role;
