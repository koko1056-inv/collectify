// supabase/functions/_shared/ai.ts の振る舞いテスト
//
//   node scripts/test-ai-adapter.mjs
//
// このリポジトリには Deno が無く、Edge Function の型チェックも実行もできない。
// 一方 ai.ts は3つの接続先（Gemini 直結 / Vercel / Lovable）向けに
// リクエストを組み立て直す層で、ここを間違えると7本すべてが壊れる。
// なので fetch と Deno.env を差し替えて、送信する本文と読み取り結果だけを検証する。
//
// esbuild で ai.ts を Node 向けに束ね、Deno std の base64 だけ Buffer に差し替えている。

import * as esbuild from "esbuild";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";

const outfile = join(mkdtempSync(join(tmpdir(), "ai-adapter-")), "ai.mjs");

await esbuild.build({
  entryPoints: ["supabase/functions/_shared/ai.ts"],
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  plugins: [
    {
      name: "deno-std-base64",
      setup(build) {
        build.onResolve({ filter: /^https:\/\/deno\.land\/std.*\/base64\.ts$/ }, () => ({
          path: "deno-std-base64",
          namespace: "shim",
        }));
        build.onLoad({ filter: /.*/, namespace: "shim" }, () => ({
          contents: `export function encodeBase64(b){return Buffer.from(b).toString("base64")}`,
          loader: "js",
        }));
      },
    },
  ],
});

// ── Deno と fetch の差し替え ────────────────────────────────

const env = {};
globalThis.Deno = { env: { get: (k) => env[k] } };

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
const PNG_B64 = PNG.toString("base64");

let captured = [];
let fetchImpl;

const defaultFetch = async (url, init) => {
  const u = String(url);
  captured.push({ url: u, init });
  if (u.startsWith("https://cdn.example.com/big")) {
    return new Response(Buffer.alloc(8 * 1024 * 1024), {
      status: 200,
      headers: { "content-type": "image/png" },
    });
  }
  if (u.startsWith("https://cdn.example.com/missing")) {
    return new Response("nope", { status: 404 });
  }
  if (u.startsWith("https://cdn.example.com/")) {
    return new Response(PNG, { status: 200, headers: { "content-type": "image/png" } });
  }
  if (u.includes("generativelanguage")) {
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                { text: "説明テキスト" },
                { inlineData: { mimeType: "image/jpeg", data: "QUJD" } },
              ],
            },
          },
        ],
      }),
      { status: 200 }
    );
  }
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: "ゲートウェイの応答",
            images: [{ image_url: { url: "data:image/png;base64,ZZZ" } }],
          },
        },
      ],
    }),
    { status: 200 }
  );
};

globalThis.fetch = (...args) => (fetchImpl ?? defaultFetch)(...args);

const { callAi, currentAiProvider } = await import(outfile);

// ── テストの足回り ──────────────────────────────────────────

let pass = 0;
const failures = [];
const check = (name, cond, extra = "") => {
  if (cond) {
    pass++;
  } else {
    failures.push(`${name}${extra ? ` — ${extra}` : ""}`);
    console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`);
  }
};
const reset = () => {
  captured = [];
  fetchImpl = null;
  for (const k of Object.keys(env)) delete env[k];
};
const section = (title) => console.log(`\n${title}`);
const geminiBody = () =>
  JSON.parse(captured.find((c) => c.url.includes("generativelanguage")).init.body);
const geminiReq = () => captured.find((c) => c.url.includes("generativelanguage"));

// 既定では警告が混ざって読みにくいので抑える
const realWarn = console.warn;
console.warn = () => {};

// ── 1. 接続先の選択 ────────────────────────────────────────

section("[1] 接続先の選択");
reset();
env.LOVABLE_API_KEY = "lov";
check("鍵が LOVABLE_API_KEY のみなら lovable", currentAiProvider() === "lovable", currentAiProvider());
env.AI_GATEWAY_API_KEY = "verc";
check("AI_GATEWAY_API_KEY があれば vercel が優先", currentAiProvider() === "vercel", currentAiProvider());
env.GEMINI_API_KEY = "SECRETKEY123";
check("GEMINI_API_KEY が最優先", currentAiProvider() === "gemini", currentAiProvider());
reset();
check("鍵が無ければ none", currentAiProvider() === "none", currentAiProvider());

// ── 2. OpenAI 互換経路が移行前と同じ本文を送るか ───────────
//
// ここが崩れると、鍵を入れ替える前の状態で挙動が変わってしまう。

section("[2] OpenAI 互換経路（Vercel / Lovable）");
reset();
env.LOVABLE_API_KEY = "lov";
let r = await callAi({ messages: [{ role: "user", content: "やあ" }], wantImage: true });
let req = captured.at(-1);
let body = JSON.parse(req.init.body);
check("URL が Lovable のゲートウェイ", req.url === "https://ai.gateway.lovable.dev/v1/chat/completions", req.url);
check("Authorization: Bearer", req.init.headers.Authorization === "Bearer lov");
check("model に google/ 接頭辞が残る", body.model === "google/gemini-2.5-flash-image", body.model);
check('modalities が ["image","text"]', JSON.stringify(body.modalities) === '["image","text"]');
check("画像生成時に response_format は付かない", !("response_format" in body));
check("指定しなければ temperature は付かない", !("temperature" in body));
check("画像URLを読み取れる", r.imageUrl === "data:image/png;base64,ZZZ", r.imageUrl);
check("テキストを読み取れる", r.text === "ゲートウェイの応答", r.text);
check("参照画像を自前で取得しない（ゲートウェイ任せ）", captured.length === 1, `${captured.length} 回`);

reset();
env.AI_GATEWAY_API_KEY = "verc";
await callAi({ messages: [{ role: "user", content: "x" }], jsonOutput: true, temperature: 0.7 });
body = JSON.parse(captured.at(-1).init.body);
check("URL が Vercel のゲートウェイ", captured.at(-1).url === "https://ai-gateway.vercel.sh/v1/chat/completions");
check("文章用モデルが選ばれる", body.model === "google/gemini-2.5-flash", body.model);
check("jsonOutput → response_format", body.response_format?.type === "json_object");
check("temperature が通る", body.temperature === 0.7);
check("文章生成時に modalities は付かない", !("modalities" in body));

// ── 3. Gemini ネイティブの組み立て ─────────────────────────

section("[3] Gemini ネイティブ経路");
reset();
env.GEMINI_API_KEY = "SECRETKEY123";
r = await callAi({
  messages: [
    { role: "system", content: "システム指示" },
    {
      role: "user",
      content: [
        { type: "text", text: "この2枚を合成" },
        { type: "image_url", image_url: { url: "https://cdn.example.com/a.png", detail: "high" } },
        { type: "image_url", image_url: { url: "data:image/gif;base64,R0lGOD" } },
      ],
    },
    { role: "assistant", content: "わかりました" },
    { role: "user", content: "続けて" },
  ],
  wantImage: true,
});
body = geminiBody();
check(
  "エンドポイントが :generateContent",
  geminiReq().url ===
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
  geminiReq().url
);
check(
  "model 名から google/ 接頭辞が外れる",
  geminiReq().url.split("/models/")[1] === "gemini-2.5-flash-image:generateContent",
  geminiReq().url.split("/models/")[1]
);
check("鍵は x-goog-api-key ヘッダで送る", geminiReq().init.headers["x-goog-api-key"] === "SECRETKEY123");
check("鍵を URL に載せない", !geminiReq().url.includes("SECRETKEY123"));
check("Authorization ヘッダは使わない", !("Authorization" in geminiReq().init.headers));
check("system は systemInstruction に分ける", body.systemInstruction?.parts?.[0]?.text === "システム指示");
check("contents に system が混ざらない", body.contents.length === 3, `${body.contents.length} 件`);
check("assistant は model にリネーム", body.contents[1].role === "model", body.contents[1].role);
check("user はそのまま", body.contents[0].role === "user" && body.contents[2].role === "user");
check(
  "画像出力を responseModalities で要求",
  JSON.stringify(body.generationConfig?.responseModalities) === '["TEXT","IMAGE"]',
  JSON.stringify(body.generationConfig)
);

let parts = body.contents[0].parts;
check("parts が3件", parts.length === 3, `${parts.length} 件`);
check("1件目はテキスト", parts[0].text === "この2枚を合成");
check(
  "2件目は取得した画像が inline_data になる",
  parts[1].inline_data?.mime_type === "image/png" && parts[1].inline_data?.data === PNG_B64,
  JSON.stringify(parts[1])
);
check(
  "3件目は data URL をそのまま分解する",
  parts[2].inline_data?.mime_type === "image/gif" && parts[2].inline_data?.data === "R0lGOD",
  JSON.stringify(parts[2])
);
check("参照画像の取得は1回だけ", captured.filter((c) => c.url.startsWith("https://cdn.example.com/")).length === 1);
check("image_url は送らない（Gemini は受け取れない）", !geminiReq().init.body.includes("image_url"));
check("detail は送らない（Gemini に無い）", !geminiReq().init.body.includes("detail"));
check("inlineData から data URL を組み立てる", r.imageUrl === "data:image/jpeg;base64,QUJD", r.imageUrl);
check("テキストも取り出せる", r.text === "説明テキスト", r.text);

// 画像は並列で取得するので、並び順が保たれることを確かめる。
// アバター→グッズの順が崩れると edit-image の出力が変わってしまう。
reset();
env.GEMINI_API_KEY = "SECRETKEY123";
await callAi({
  messages: [
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
        { type: "text", text: "まんなか" },
        { type: "image_url", image_url: { url: "https://cdn.example.com/b.png" } },
      ],
    },
  ],
  wantImage: true,
});
parts = geminiBody().contents[0].parts;
check(
  "並列取得でも並び順が保たれる",
  parts[0].inline_data?.data === "AAAA" &&
    parts[1].text === "まんなか" &&
    parts[2].inline_data?.data === PNG_B64,
  JSON.stringify(parts)
);

reset();
env.GEMINI_API_KEY = "SECRETKEY123";
await callAi({ messages: [{ role: "user", content: "x" }], jsonOutput: true });
body = geminiBody();
check("jsonOutput → responseMimeType", body.generationConfig?.responseMimeType === "application/json");
check("文章生成時は responseModalities を付けない", !("responseModalities" in (body.generationConfig ?? {})));
check("文章用モデルが使われる", geminiReq().url.includes("gemini-2.5-flash:generateContent"), geminiReq().url);

// ── 4. エラー経路 ──────────────────────────────────────────

section("[4] エラー経路");
reset();
env.GEMINI_API_KEY = "SECRETKEY123";
fetchImpl = async () => new Response("quota exceeded", { status: 429, statusText: "Too Many Requests" });
r = await callAi({ messages: [{ role: "user", content: "x" }] });
check("429 が status に出る", r.ok === false && r.status === 429);
check("statusText が保たれる（各関数のエラー文言で使う）", r.statusText === "Too Many Requests", r.statusText);
check("errorText に本文が入る", r.errorText === "quota exceeded");
check("失敗時は imageUrl と text が null", r.imageUrl === null && r.text === null);

reset();
let threw = null;
try {
  await callAi({ messages: [{ role: "user", content: "x" }] });
} catch (e) {
  threw = e;
}
check("鍵が1つも無ければ投げる", threw !== null && /GEMINI_API_KEY is not configured/.test(threw.message), String(threw));

// 参照画像が取れないときは、生成しても意味が無いので投げる。
reset();
env.GEMINI_API_KEY = "SECRETKEY123";
threw = null;
try {
  await callAi({
    messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "https://cdn.example.com/missing.png" } }] }],
    wantImage: true,
  });
} catch (e) {
  threw = e;
}
check("参照画像が404なら投げる", threw !== null && /参照画像を取得できませんでした \(404\)/.test(threw.message), String(threw));
check("参照画像が取れなければ生成を呼ばない", !captured.some((c) => c.url.includes("generativelanguage")));

reset();
env.GEMINI_API_KEY = "SECRETKEY123";
threw = null;
try {
  await callAi({
    messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "https://cdn.example.com/big.png" } }] }],
    wantImage: true,
  });
} catch (e) {
  threw = e;
}
check("大きすぎる参照画像は弾く", threw !== null && /参照画像が大きすぎます/.test(threw.message), String(threw));

reset();
env.GEMINI_API_KEY = "SECRETKEY123";
threw = null;
try {
  await callAi({
    messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "ftp://example.com/a.png" } }] }],
    wantImage: true,
  });
} catch (e) {
  threw = e;
}
check("http(s) 以外の参照画像URLは弾く", threw !== null && /参照画像のURLが不正です/.test(threw.message), String(threw));

// ── 結果 ────────────────────────────────────────────────────

console.warn = realWarn;
if (failures.length === 0) {
  console.log(`\n✓ ${pass} 件すべて通過`);
} else {
  console.log(`\n✗ ${failures.length} 件失敗 / ${pass} 件通過`);
}
process.exit(failures.length === 0 ? 0 : 1);
