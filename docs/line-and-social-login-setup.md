# LINE通知・LINEログイン・Appleサインインの設定

このPRで入ったコードは、すべて機能フラグの裏にある。**何も設定しなければ、今までと完全に同じ動作のまま。**
有効にするには、以下を実際の管理画面で設定する必要がある（このリポジトリのコードだけでは完結しない）。

適用対象のSupabaseプロジェクト: `dmgrgzysrzzgsajwqyrh`（`src/integrations/supabase/client.ts` の `SUPABASE_URL` と同じ）。

## 0. 先に適用するもの

- **DBマイグレーション**（`supabase/migrations/20261020180000_line_push_tables.sql` と
  `20261020180100_social_login_profile_and_cron.sql`）は、このPRではファイルを作っただけで本番には
  **未適用**。Supabaseダッシュボードの「SQL Editor」か `supabase db push` で、内容を確認した上で適用すること。
- **Edge Function**（`line-push`、`line-webhook`）もデプロイされていない。1と4で使う前にデプロイが必要。
  ```
  supabase functions deploy line-push
  supabase functions deploy line-webhook --no-verify-jwt
  ```
  （`supabase/config.toml` に両方 `verify_jwt = false` を書いてあるので、`line-push` 側は
  `--no-verify-jwt` を付けなくても設定ファイルどおりになるはずだが、環境によっては明示的に付けること）。

## 1. LINE Developers（公式アカウント・LINEログイン・Messaging API）

1. [LINE Developers コンソール](https://developers.line.biz/console/) で、プロバイダーを作成（既存のものがあれば流用）。
2. そのプロバイダーの下に **LINEログインチャネル** を新規作成。
   - コールバックURL（Callback URL）に次を追加:
     `https://dmgrgzysrzzgsajwqyrh.supabase.co/auth/v1/callback`
   - メールアドレス取得の権限（Email address permission）の申請は任意（取得できれば `profiles` の
     表示名などに使えるが、無くても動く。LINEのIDトークンはメールを含まないことが多い）。
3. 同じプロバイダーの下に、公式アカウント（Messaging APIチャネル）を作成、または既存の公式アカウントを
   Messaging API用に設定する。**LINEログインチャネルとMessaging APIチャネルは、同じプロバイダー配下に
   置くこと**（`src/contexts/AuthContext.tsx` のコメントにある通り、そうすればログインで取得する
   LINEユーザーID〔`identity.identity_data.sub`〕と、Messaging APIのfollowイベントで来るユーザーIDが
   同じ値になり、`line_user_links` 1行で両方をまとめられる）。
4. Messaging APIチャネルの設定:
   - **Webhook URL**: `https://dmgrgzysrzzgsajwqyrh.supabase.co/functions/v1/line-webhook`
   - Webhookの利用を有効化（Use webhook: ON）
   - 応答メッセージ（Auto-reply messages）を **OFF**、あいさつメッセージも運用方針に応じて設定
   - **チャネルアクセストークン**（長期）を発行 → 下の3で `LINE_CHANNEL_ACCESS_TOKEN` として設定
   - **チャネルシークレット** → 下の3で `LINE_CHANNEL_SECRET` として設定（Webhookの署名検証に使う）
5. 公式アカウントの **ベーシックID**（`@`で始まるID）を確認 → 下の4で `VITE_LINE_OA_BASIC_ID` に設定。

## 2. Supabase Dashboard（Authentication）

### Apple
`Authentication > Providers > Apple` を有効化し、Apple Developer側で発行した以下を入力:
- Services ID（Client ID）
- Team ID
- Key ID
- 秘密鍵（.p8）

> Supabaseが生成する Apple Client Secret は **6か月ごとに有効期限が切れる**。期限前に再発行して
> Supabaseの設定を更新する運用が必要（カレンダーに登録するなど）。

### LINE（カスタムOAuthプロバイダ）
LINEは組み込みのプロバイダ一覧に無いため、`Authentication > Providers` の **Custom OAuth provider**
（手動設定）として `custom:line`（`VITE_LINE_AUTH_PROVIDER` の既定値。変える場合は両方揃える）を追加する。

- Authorization URL: `https://access.line.me/oauth2/v2.1/authorize`
- Token URL: `https://api.line.me/oauth2/v2.1/token`
- Userinfo URL: `https://api.line.me/oauth2/v2.1/userinfo`
- Scopes: `profile openid`
- Client ID / Client Secret: LINEログインチャネルのチャネルID／チャネルシークレット

**OIDCの自動検出（Discovery）は使わず、OAuth2の手動設定にすること。** LINEログインのIDトークンは
署名方式がHS256（対称鍵）で、Supabase/多くのOIDCライブラリが前提とするRS256の自動検出とは相性が悪い
ため、手動設定のOAuth2フロー（Userinfo URLからプロフィールを取得する方式）を使う。

- **Allow users without email** を ON にする（LINEはメールアドレスを返さないことが多い）。

### 共通設定
- `Authentication > URL Configuration` の **Redirect URLs** に `https://collectify.jp/login` を追加。
- `Authentication > Providers` の **Manual linking** を有効化（マイページの「LINE/Appleを連携」が
  `supabase.auth.linkIdentity` を使うため。無効のままだとエラーになり、設定画面にその旨のメッセージが出る）。

## 3. Supabase Secrets（Edge Functions）

`Project Settings > Edge Functions > Secrets`、または `supabase secrets set` で設定する
（**値はこのリポジトリのどこにも書かない**）。

| キー | 用途 | 未設定のときの動作 |
| --- | --- | --- |
| `LINE_CHANNEL_ACCESS_TOKEN` | `line-push` がMessaging APIで送信するときのトークン | 何も送らずログだけ残して200を返す |
| `LINE_CHANNEL_SECRET` | `line-webhook` が `X-Line-Signature` を検証する鍵 | 503を返す（検証できないので処理しない） |

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` は既存のEdge Functionと同じく
Supabaseが自動で注入するので、個別設定は不要。

## 4. Vercel（フロントエンドの環境変数）

| キー | 値の例 | 説明 |
| --- | --- | --- |
| `VITE_LINE_OA_BASIC_ID` | `@xxxxxxx` | 設定すると「友だち追加」の案内カードが出る |
| `VITE_ENABLE_LINE_LOGIN` | `true` | ログイン画面に「LINEでログイン」ボタンが出る |
| `VITE_LINE_AUTH_PROVIDER` | `custom:line` | 2で作ったカスタムプロバイダの識別子と一致させる（省略時は`custom:line`） |
| `VITE_ENABLE_APPLE_LOGIN` | `true` | ログイン画面に「Appleでサインイン」ボタンが出る |

`.env.example` にも同じキーを値なしで追記済み。

## 5. iOS（Capacitor）アプリ

- Apple Developer側で、App IDに **Sign in with Apple** のCapabilityを追加し、**Services ID** と
  **Return URL**（Supabaseのコールバック）を設定する。
- ネイティブの「Appleでサインイン」はWeb版のOAuthリダイレクトとは別物で、Capacitorプラグイン
  （例: `@capacitor-community/apple-sign-in`）を使ったネイティブ実装が別途必要になる場合がある。
  **このPRではWeb版の `supabase.auth.signInWithOAuth({ provider: 'apple' })` のみを実装しており、
  iOSアプリ内でのネイティブSign in with Appleの対応は別タスク。** `src/pages/Login.tsx` は
  `Capacitor.getPlatform() === 'ios'` のときApple優先表示に切り替えるだけで、認証フロー自体は
  Web版のOAuthリダイレクトのまま。

## 6. プライバシーポリシー

`src/content/legal.ts` の「第三者への提供と委託」「外部送信」の表は、このPRで
LINEログイン・Appleサインインの分を追記済み（既存のLINE連携〔LIFF〕とApple課金の行を拡張し、
Apple Sign Inの行を外部送信の表に新設した）。文言の追加はこのPRに含まれているため、
運用上あらためて書く必要はない。方針を変える場合はそちらを編集すること。

## 7. 動作確認の順番（おすすめ）

1. マイグレーション適用 → Edge Function 2本デプロイ → Secrets設定。
2. Vercelに環境変数を設定してデプロイ。
3. ログイン画面で「LINEでログイン」「Appleでサインイン」が出ることを確認（新規登録・ログイン両方）。
4. LINEでログイン→マイページ「LINE通知」がONで出て、`line_user_links` に行ができていることを確認。
5. LINE公式アカウントを友だち追加→Webhookが呼ばれ `friend_added` が `true` になることを確認。
6. `supabase functions invoke line-push --body '{"kind":"digest"}'`（管理者JWTか、
   `x-cron-secret` ヘッダで）を手動実行し、`line_push_log` に記録されること・実際にLINEへ届くことを確認。
