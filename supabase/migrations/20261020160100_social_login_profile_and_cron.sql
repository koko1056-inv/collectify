-- ソーシャルログイン（LINE / Apple）でも profiles が作れるようにする + LINE push の定期実行
--
-- 【なぜ】
-- handle_new_user()（20250823072201）は raw_user_meta_data->>'username' が無いと例外を投げて
-- サインアップ自体を失敗させる。username@example.com方式のサインアップは常に username を渡すので
-- 問題ないが、LINE/Apple の signInWithOAuth はこの meta を渡さないため、
-- そのままではOAuthの新規ユーザーで auth.users の行だけ出来て profiles が作れず、
-- アプリのほとんどの機能（profilesへの外部キー参照）が動かない。
--
-- 【どうする】
-- username が無いときは一意な user_xxxxxx を生成して使う（既存のusername登録は今までと同じ動作）。
-- display_name は raw_user_meta_data の name / full_name / display_name があれば使う
-- （LINEのプロフィール名、Appleのフルネームはサインアップ時の一度だけ渡ってくる）。
--
-- このマイグレーションは本番に未適用（ファイルのみ）。CREATE OR REPLACE FUNCTION は既存のトリガーの
-- 定義には触れない（トリガー自体を作るマイグレーションがリポジトリに無いため、関数の中身だけ安全に差し替える）。

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_display_name text;
  v_candidate text;
  v_tries integer := 0;
begin
  v_username := new.raw_user_meta_data->>'username';

  if v_username is null then
    -- OAuth（LINE/Apple）経由のユーザー。username@example.com方式ではないので生成する。
    loop
      v_candidate := 'user_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8 + v_tries);
      begin
        v_display_name := coalesce(
          new.raw_user_meta_data->>'display_name',
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'name',
          v_candidate
        );
        insert into public.profiles (id, username, display_name)
        values (new.id, v_candidate, v_display_name);
        return new;
      exception
        when unique_violation then
          v_tries := v_tries + 1;
          if v_tries > 5 then
            raise exception 'Failed to generate a unique username';
          end if;
      end;
    end loop;
  end if;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    v_username,
    coalesce(new.raw_user_meta_data->>'display_name', v_username)
  );
  return new;
exception
  when others then
    raise exception 'Failed to create profile: %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- LINE push を定期実行から呼ぶための合言葉（catalog-thumbs-recent と同じやり方）
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'line_push_cron_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'line_push_cron_secret',
      'line-push 関数を cron から呼ぶための合言葉'
    );
  end if;
end;
$$;

create or replace function public.line_push_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(length(p_secret), 0) >= 32
     and exists (
       select 1 from vault.decrypted_secrets
        where name = 'line_push_cron_secret' and decrypted_secret = p_secret
     );
$$;

revoke all on function public.line_push_secret_ok(text) from public, anon, authenticated;
grant execute on function public.line_push_secret_ok(text) to service_role;

-- ---------------------------------------------------------------------------
-- 定期実行: 推しの新商品・交換の返事は10分ごと（送るものが無ければ関数を呼ばない）、
--          デイリーログインの催促は毎日20:00 JST（=11:00 UTC）に1回。
-- どちらも pg_cron があるときだけ登録する。LINE_CHANNEL_ACCESS_TOKEN が未設定でも
-- line-push 関数自身が何もせず200を返すので、ここでは秘密情報は一切書かない。
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'line-push-digest') then
      perform cron.unschedule('line-push-digest');
    end if;
    perform cron.schedule(
      'line-push-digest',
      '*/10 * * * *',
      $cron$
      select net.http_post(
        url := 'https://dmgrgzysrzzgsajwqyrh.supabase.co/functions/v1/line-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'line_push_cron_secret')
        ),
        body := '{"kind": "digest", "limit": 50}'::jsonb,
        timeout_milliseconds := 60000
      )
      where exists (select 1 from public.line_push_digest_candidates(1));
      $cron$
    );

    if exists (select 1 from cron.job where jobname = 'line-push-daily-reminder') then
      perform cron.unschedule('line-push-daily-reminder');
    end if;
    perform cron.schedule(
      'line-push-daily-reminder',
      '0 11 * * *',
      $cron$
      select net.http_post(
        url := 'https://dmgrgzysrzzgsajwqyrh.supabase.co/functions/v1/line-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'line_push_cron_secret')
        ),
        body := '{"kind": "daily_reminder", "limit": 200}'::jsonb,
        timeout_milliseconds := 60000
      )
      where exists (select 1 from public.line_push_daily_reminder_candidates(1));
      $cron$
    );
  end if;
end;
$$;

-- 確かめ方（適用後）:
--   select * from cron.job where jobname like 'line-push-%';
--   select public.line_push_secret_ok('wrong');  -- false
-- 元に戻すとき:
--   select cron.unschedule('line-push-digest');
--   select cron.unschedule('line-push-daily-reminder');
