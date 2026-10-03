import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAi } from "../_shared/ai.ts";

// 作品情報が無いグッズに、AIで作品名を推定して紐づける。
//
// なぜ要るか: user_items 254件のうち126件は作品が分からない状態だった
// （自分の content_name が空で、カタログにも紐付いていない）。
// 交換の相手探しは作品名で寄せているので、この126件は何をしても
// 候補に出てこない。タイトルは「ちいかわ キュッ おくるみ…」「MGA Rocket
// Bracelet」のように作品が十分読み取れるものが多く、AIで埋められる。
//
// 設計上の約束:
//   * 既存の作品名リストを渡し、その中から選ばせるのを第一候補にする。
//     自由に書かせると「ミセスグリーンアップル」と「Mrs. GREEN APPLE」が
//     併存し、寄せるための作品名が逆に分散する。
//   * **タグは作らない。** 書き込むのは content_name だけ。
//     タグ作成は利用者の確認を取ってから行う運用になっているため、
//     この関数からは触らない。
//   * preview と apply を分ける。推定しただけでは何も書き換わらない。
//     管理画面で中身を見て、選んだものだけが apply に渡る。

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** 一度に推定する件数の上限。多すぎると1回の応答が崩れやすい。 */
const MAX_BATCH = 40;

export interface Candidate {
  id: string;
  kind: "user_item" | "official_item";
  title: string;
  /** AIが答えた作品名。分からなければ null。 */
  suggestion: string | null;
  /** 既存の作品名リストに無い新しい名前か。 */
  isNew: boolean;
  /** 0〜1。低いものは既定で選択を外す。 */
  confidence: number;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Authorization header is required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // 他人のグッズにも書き込むので管理者に限る。
    const { data: hasAdmin, error: roleError } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleError || !hasAdmin) {
      return json({ error: "Forbidden: admin role required" }, 403);
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(() => ({}));
    const mode: string = body?.mode ?? "preview";

    // ── 既知の作品名。推定の選択肢として渡す ──
    const knownSeries = await loadKnownSeries(admin);

    if (mode === "preview") {
      const limit = Math.min(Number(body?.limit) || MAX_BATCH, MAX_BATCH);
      const targets = await loadTargets(admin, limit);
      if (targets.length === 0) {
        return json({ candidates: [], knownSeries, remaining: 0 });
      }

      const candidates = await inferSeries(targets, knownSeries);
      const remaining = await countTargets(admin);
      return json({ candidates, knownSeries, remaining });
    }

    if (mode === "apply") {
      const updates: Array<{ id: string; kind: string; contentName: string }> =
        Array.isArray(body?.updates) ? body.updates : [];
      if (updates.length === 0) {
        return json({ error: "updates is required" }, 400);
      }

      let applied = 0;
      const failures: Array<{ id: string; error: string }> = [];

      for (const u of updates) {
        const name = String(u.contentName ?? "").trim();
        // 空文字で上書きすると、元から空だったのか消したのか分からなくなる。
        if (!name || !u.id) continue;

        const table = u.kind === "official_item" ? "official_items" : "user_items";
        const { error } = await admin.from(table).update({ content_name: name }).eq("id", u.id);
        if (error) {
          console.error(`[backfill-item-series] update failed ${table}/${u.id}:`, error);
          failures.push({ id: u.id, error: error.message });
          continue;
        }
        applied += 1;
      }

      const remaining = await countTargets(admin);
      return json({ applied, failures, remaining });
    }

    return json({ error: `unknown mode: ${mode}` }, 400);
  } catch (e) {
    console.error("[backfill-item-series] unhandled:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

/** 既に使われている作品名を集める。綴りを揃えるための辞書になる。 */
async function loadKnownSeries(admin: ReturnType<typeof createClient>): Promise<string[]> {
  const [official, items, tags] = await Promise.all([
    admin.from("official_items").select("content_name").not("content_name", "is", null),
    admin.from("user_items").select("content_name").not("content_name", "is", null),
    admin.from("tags").select("name").eq("category", "series"),
  ]);

  const set = new Set<string>();
  for (const row of official.data ?? []) {
    const v = (row.content_name ?? "").trim();
    if (v) set.add(v);
  }
  for (const row of items.data ?? []) {
    const v = (row.content_name ?? "").trim();
    if (v) set.add(v);
  }
  for (const row of tags.data ?? []) {
    const v = (row.name ?? "").trim();
    if (v) set.add(v);
  }
  return [...set].sort();
}

export interface Target {
  id: string;
  kind: "user_item" | "official_item";
  title: string;
}

/**
 * 作品名が無いものを集める。
 *
 * カタログ品を先に出す。1件直すと、それを持っている全員のグッズに
 * 一度に作品名が付くため、user_items を1件ずつ直すより効きが大きい。
 */
async function loadTargets(
  admin: ReturnType<typeof createClient>,
  limit: number
): Promise<Target[]> {
  const out: Target[] = [];

  const { data: official } = await admin
    .from("official_items")
    .select("id, title")
    .or("content_name.is.null,content_name.eq.")
    .limit(limit);

  for (const row of official ?? []) {
    out.push({ id: row.id, kind: "official_item", title: row.title ?? "" });
  }

  if (out.length < limit) {
    const { data: items } = await admin
      .from("user_items")
      .select("id, title")
      .is("official_item_id", null)
      .or("content_name.is.null,content_name.eq.")
      .limit(limit - out.length);

    for (const row of items ?? []) {
      out.push({ id: row.id, kind: "user_item", title: row.title ?? "" });
    }
  }

  return out.filter((t) => t.title.trim().length > 0);
}

async function countTargets(admin: ReturnType<typeof createClient>): Promise<number> {
  const [official, items] = await Promise.all([
    admin
      .from("official_items")
      .select("id", { count: "exact", head: true })
      .or("content_name.is.null,content_name.eq."),
    admin
      .from("user_items")
      .select("id", { count: "exact", head: true })
      .is("official_item_id", null)
      .or("content_name.is.null,content_name.eq."),
  ]);
  return (official.count ?? 0) + (items.count ?? 0);
}

/** AIにまとめて推定させる。画像は使わず、タイトルだけで判断させる。 */
async function inferSeries(targets: Target[], knownSeries: string[]): Promise<Candidate[]> {
  const list = targets
    .map((t, i) => `${i}: ${t.title}`)
    .join("\n");

  const systemPrompt = [
    "あなたは日本のキャラクターグッズ・アーティストグッズに詳しい担当者です。",
    "グッズ名の一覧を渡すので、それぞれが「どの作品・どのアーティストのグッズか」を判定してください。",
    "",
    "重要な決まり:",
    "- 既知の作品名リストを渡します。同じ対象を指すものがリストにあれば、**必ずリストの綴りをそのまま使ってください**。",
    "  例: 「MGA」「Mrs. GREEN APPLE」はリストに「ミセスグリーンアップル」があればそれを使う。",
    "- リストに無く、かつ確実に分かる場合だけ新しい名前を書き、isNew を true にしてください。",
    "- 判断できないものは series を null にしてください。推測で埋めないでください。",
    "- series には作品名・アーティスト名だけを書きます。商品名やキャラクター名は書きません。",
    "  例: 「ちいかわ キュッ おくるみぷちミニマスコット（ハチワレ）」→ 「ちいかわ」",
    "- confidence は 0 から 1 の数値で、確信度を正直に入れてください。",
    "",
    "出力は次の形の JSON だけを返してください。説明文は書かないでください。",
    '{"results":[{"index":0,"series":"ちいかわ","isNew":false,"confidence":0.95}]}',
  ].join("\n");

  const userPrompt = [
    "既知の作品名リスト:",
    knownSeries.length > 0 ? knownSeries.map((s) => `- ${s}`).join("\n") : "(まだありません)",
    "",
    "判定するグッズ名:",
    list,
  ].join("\n");

  const result = await callAi({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    jsonOutput: true,
    temperature: 0,
  });

  if (!result.ok || !result.text) {
    throw new Error(`AI error: ${result.status} ${result.statusText} ${result.errorText}`);
  }

  return toCandidates(targets, parseResults(result.text), knownSeries);
}

/**
 * AIの答えを候補の形に整える。
 *
 * 綴りの寄せをここでやる理由: モデルは「ミセスグリーンアップル」と
 * 「ミセスグリーンアップル 」「Mrs. GREEN APPLE」を混ぜて返してくる。
 * そのまま保存すると、寄せるための作品名のほうが分散してしまう。
 */
export function toCandidates(
  targets: Target[],
  parsed: Map<number, RawResult>,
  knownSeries: string[]
): Candidate[] {
  const knownLower = new Map(knownSeries.map((s) => [s.trim().toLowerCase(), s.trim()]));

  return targets.map((target, index) => {
    const hit = parsed.get(index);
    const raw = (hit?.series ?? "").trim();
    // 大文字小文字や前後の空白だけの違いは既存の綴りに寄せる。
    const canonical = knownLower.get(raw.toLowerCase());
    return {
      id: target.id,
      kind: target.kind,
      title: target.title,
      suggestion: raw ? (canonical ?? raw) : null,
      isNew: raw ? !canonical : false,
      confidence: typeof hit?.confidence === "number" ? hit.confidence : 0,
    };
  });
}

export interface RawResult {
  series?: string | null;
  confidence?: number;
}

/** JSON以外が混ざって返ってきても拾えるようにする。 */
export function parseResults(text: string): Map<number, RawResult> {
  const out = new Map<number, RawResult>();
  let payload = text.trim();

  // ```json ... ``` で包まれて返ることがある
  const fenced = payload.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) payload = fenced[1].trim();

  // 前後に文章が付いていても、最初の { から最後の } までを取る
  const start = payload.indexOf("{");
  const end = payload.lastIndexOf("}");
  if (start >= 0 && end > start) payload = payload.slice(start, end + 1);

  try {
    const obj = JSON.parse(payload);
    const results = Array.isArray(obj?.results) ? obj.results : [];
    for (const r of results) {
      const idx = Number(r?.index);
      if (!Number.isInteger(idx)) continue;
      out.set(idx, { series: r?.series ?? null, confidence: r?.confidence });
    }
  } catch (e) {
    console.error("[backfill-item-series] failed to parse AI output:", e, text.slice(0, 500));
  }
  return out;
}
