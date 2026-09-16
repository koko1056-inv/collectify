# Collectify

推し活グッズのコレクション管理アプリ。持っているグッズを登録し、欲しいものを登録すると、
交換相手が見つかる。選んだグッズから AI が部屋やアバターを描く。

## 構成

| | |
| --- | --- |
| フロント | React 18 + Vite 5 + TypeScript / Tailwind + shadcn-ui |
| データ | Supabase（Postgres + RLS + Storage + Edge Functions） |
| ホスティング | Vercel（`main` への push で自動デプロイ） |
| AI | Google Gemini API（直結）。ゲートウェイ経由にも切り替えられる |

## 開発

Node.js と npm が必要（[nvm で入れる](https://github.com/nvm-sh/nvm#installing-and-updating)）。

```sh
npm install
npm run dev        # http://localhost:8080
```

変更を出す前に通すもの:

```sh
npm run typecheck          # tsc（-p tsconfig.app.json。ルートの tsconfig では src を見ないので注意）
npm run lint
npm run build
node scripts/check-i18n.mjs   # 日本語・英語のキーが揃っているか
```

### 環境変数

`.env.example` を `.env` にコピーして埋める。フロントで使うものは `VITE_` 接頭辞が必要。

| 変数 | 用途 |
| --- | --- |
| `VITE_APP_URL` | 「URLをコピー」で配る正規URL。未設定なら開いているドメインを使う |
| `VITE_REVENUECAT_IOS_KEY` | iOS の課金 |

## Edge Functions

`supabase/functions/` 以下。AI を呼ぶ7本は接続先を `_shared/ai.ts` に集約してあるので、
プロバイダを変えるときはそのファイルだけを触る。

接続先は鍵の有無で決まる。上の3つのうち、`GEMINI_API_KEY` → `AI_GATEWAY_API_KEY` →
`LOVABLE_API_KEY` の順に見て最初に見つかったものを使う。切り替えも切り戻しも
環境変数だけで済み、再デプロイは要らない。

Gemini 直結とゲートウェイ経由では通信の形が違う（Gemini は参照画像を URL で受け取らず
inline base64 が必要、`contents`/`systemInstruction` という別の構造、画像は
`responseModalities` で要求する）。その差は `_shared/ai.ts` が吸収していて、
各関数は OpenAI 形式のまま `callAi()` を呼ぶ。

この層は Deno が無いと実行できないが、`fetch` と `Deno.env` を差し替えた
振る舞いテストがある。接続先ごとに何を送り何を読み取るかを検証する:

```sh
npm run test:ai
```

サーバー側で必要な秘密情報（Supabase のダッシュボードで設定）:

| 変数 | 用途 |
| --- | --- |
| `GEMINI_API_KEY` | Google Gemini API の鍵。**通常はこれだけ設定する** |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway に切り替えるときの鍵（任意） |
| `LOVABLE_API_KEY` | Lovable のゲートウェイに戻すときの鍵（任意・移行前の退避先） |
| `AI_TEXT_MODEL` / `AI_IMAGE_MODEL` | モデルの上書き。既定は `_shared/ai.ts` を参照 |
| `APP_URL` | OGP から本体へ飛ばすときの正規URL |
| `MESHY_API_KEY` | 3Dモデル生成 |
| `RESEND_API_KEY` / `TAG_NOTIFY_TO` / `TAG_NOTIFY_FROM` | 新しいタグができたときの通知メール |

## i18n

翻訳は `src/translations/modules/` に領域ごとに置く。`ja` と `en` でキー構造を揃える
（`en` が欠けたキーは日本語にフォールバックする）。`scripts/check-i18n.mjs` が
使われているのに定義が無いキーを検出する。

## データベース

スキーマ変更は `supabase/migrations/` にファイルを足して適用する。
関数は行を消さない方針（統合は `merged_into` で隠す、など）で、取り消せる形にしてある。
