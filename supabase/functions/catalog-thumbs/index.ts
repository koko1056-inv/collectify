import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// deno.land/x/imagemagick_deno は Edge Runtime で "require is not defined" になって初期化できないため、
// Supabase のドキュメントの例と同じ npm 版を使い、wasm はパッケージ内のファイルを読む。
import {
  FilterType,
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
} from "npm:@imagemagick/magick-wasm@0.0.30";
import { mediaType, readBodyCapped, safeFetch, SsrfError } from "../_shared/ssrf.ts";

/**
 * カタログ画像（official_items.image の外部URL）のサムネイルを作って Storage に置く。
 *
 * 一覧画面は外部サイトの原寸画像（1000〜2000px）を、キャッシュされない proxy-image 経由で
 * 毎回取っていた。ここで一度だけ取りに行き、480px 以内の WebP に縮めて
 *   catalog-thumbs/v1/<元URLの md5>.webp
 * に置く。画面側（src/utils/optimized-image.ts）は同じ規則でURLを計算して表示し、
 * 無ければ onError で従来の経路に戻す。
 *
 * 【安全のための決まり】
 * - 取りに行くのは DB の official_items.image にある URL だけ（呼び出し側から URL は受け取らない）
 * - 1回の呼び出しで少しずつ（既定 8 枚、最大 20 枚。変換の CPU 時間が 1 秒を超えたら残りは返す）。
 *   同時取得は 3 本まで
 * - SSRF 検査（内部アドレス・リダイレクト先の再検査）は proxy-image と同じ _shared/ssrf.ts
 * - 失敗しても止めずに catalog_image_thumbs に理由を残す（404 などはやり直さない）
 * - 呼べるのは cron（x-cron-secret）か管理者だけ
 *
 * 【呼び出し】
 *   POST /functions/v1/catalog-thumbs   { "limit": 10, "recentOnly": false }
 *   - recentOnly: true なら最近2時間に登録されたグッズだけ（cron の catalog-thumbs-recent が10分ごとに呼ぶ）
 *   - 返り値の claimed が 0 になるまで繰り返せば全件そろう（何度呼んでも二重には作らない）
 *
 * 【既存の全件を作るとき】 SQL エディタで次の cron を足す（30 秒ごとに 4 本を並列に呼ぶ。1時間に約 4,000 枚）。
 *   12 本同時に呼んだときは 2 本が WORKER_RESOURCE_LIMIT（546）になった。6 本では起きなかった。
 *   作るものが無くなったら関数を呼ばなくなるが、終わったら消してよい。
 *   select cron.schedule('catalog-thumbs-backfill', '30 seconds', $$
 *     select net.http_post(
 *       url := 'https://dmgrgzysrzzgsajwqyrh.supabase.co/functions/v1/catalog-thumbs',
 *       headers := jsonb_build_object('Content-Type','application/json',
 *         'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'catalog_thumbs_cron_secret')),
 *       body := '{"limit": 10}'::jsonb, timeout_milliseconds := 150000)
 *     from generate_series(1, 4)
 *     where exists (select 1 from public.official_items o
 *       where o.image like 'https://%' and o.image not like '%/storage/v1/%' and o.merged_into is null
 *         and not exists (select 1 from public.catalog_image_thumbs t where t.src_hash = md5(o.image)))
 *   $$);
 *   -- 止める: select cron.unschedule('catalog-thumbs-backfill');
 *   -- 進み具合: select status, count(*) from catalog_image_thumbs group by 1;
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const BUCKET = "catalog-thumbs";
/** サムネの置き場所の版。縮め方を変えて作り直すときはここと画面側を同時に上げる */
const PATH_VERSION = "v1";
/** この四角に収まるように縮める（一覧のマスは最大でも 240px 前後 × 2倍密度） */
const MAX_EDGE = 480;
const WEBP_QUALITY = 75;
/** 元画像の上限。これより大きいものは作らない */
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const CONCURRENCY = 3;
/** 1回の呼び出しで、これを過ぎたら新しい画像に手を付けない（関数の制限時間より十分短く） */
const TIME_BUDGET_MS = 100_000;
/**
 * Edge Function は1リクエストあたりの CPU 時間が約2秒まで。変換（同期処理）にかかった時間の合計が
 * これを超えたら、残りは手を付けずに返す。手元の計測で1枚 100〜450ms（中央値 150ms 前後）。
 */
const CPU_BUDGET_MS = 1_000;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

let magickReady: Promise<void> | null = null;
function ensureMagick(): Promise<void> {
  if (!magickReady) {
    magickReady = (async () => {
      const wasmUrl = new URL("magick.wasm", import.meta.resolve("npm:@imagemagick/magick-wasm@0.0.30"));
      await initializeImageMagick(await Deno.readFile(wasmUrl));
    })().catch((e) => {
      magickReady = null; // 次の呼び出しでやり直す
      throw e;
    });
  }
  return magickReady;
}

/** やり直しても結果が変わらない失敗（404・画像でない など） */
class PermanentError extends Error {}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * proxy-image 経由で登録されたURL（.../functions/v1/proxy-image?url=...）は、中の元URLを取りに行く。
 * サムネのパスは DB の文字列（外側のURL）の md5 のままにする（画面側が持っているのはそれなので）。
 */
function unwrapProxyUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.pathname.endsWith("/functions/v1/proxy-image")) {
      const inner = u.searchParams.get("url");
      if (inner) return inner;
    }
  } catch {
    // そのまま返す
  }
  return raw;
}

async function fetchSource(raw: string): Promise<Uint8Array> {
  const target = unwrapProxyUrl(raw);
  let response: Response;
  try {
    ({ response } = await safeFetch(target, {
      maxRedirects: 3,
      timeoutMs: FETCH_TIMEOUT_MS,
      allowDnsUnavailable: false,
      // 直リンク禁止のサイトがあるので、Referer はそのサイト自身にする（proxy-image と同じ）
      headers: (u) => ({
        "User-Agent": BROWSER_UA,
        "Accept": "image/avif,image/webp,image/*,*/*;q=0.8",
        "Accept-Language": "ja,en;q=0.9",
        "Referer": u.origin + "/",
      }),
    }));
  } catch (e) {
    // 内部アドレス・不正なURLは何度やっても同じ。DNS が引けない（502）などは一時的な失敗として扱う
    if (e instanceof SsrfError && e.status < 500) throw new PermanentError(`blocked: ${e.message}`);
    throw e;
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    // 404/410/403 などは何度やっても同じ。5xx と 429 はあとでやり直す
    if (response.status >= 500 || response.status === 429) throw new Error(`HTTP ${response.status}`);
    throw new PermanentError(`HTTP ${response.status}`);
  }
  const type = mediaType(response);
  if (type && (!type.startsWith("image/") || type.startsWith("image/svg"))) {
    await response.body?.cancel().catch(() => {});
    throw new PermanentError(`not an image: ${type}`);
  }
  try {
    return await readBodyCapped(response, MAX_SOURCE_BYTES);
  } catch (e) {
    if (e instanceof SsrfError) throw new PermanentError("too large");
    throw e;
  }
}

/** 480px の四角に収まる WebP にする。元が小さければ拡大はしない */
function toThumb(bytes: Uint8Array): { data: Uint8Array; width: number; height: number } {
  // 注: JPEG の "size" ヒント（縮小デコード）は試したが、小さい画像を逆に拡大して読むので使わない
  return ImageMagick.read(bytes, (img) => {
    const longest = Math.max(img.width, img.height);
    if (longest > MAX_EDGE) {
      const scale = MAX_EDGE / longest;
      img.filterType = FilterType.Triangle;
      img.resize(Math.max(1, Math.round(img.width * scale)), Math.max(1, Math.round(img.height * scale)));
    }
    img.strip();
    img.quality = WEBP_QUALITY;
    const width = img.width;
    const height = img.height;
    return img.write(MagickFormat.WebP, (out) => ({ data: new Uint8Array(out), width, height }));
  });
}

async function isAuthorized(req: Request, admin: ReturnType<typeof createClient>): Promise<boolean> {
  const secret = req.headers.get("x-cron-secret");
  if (secret) {
    const { data, error } = await admin.rpc("catalog_thumbs_secret_ok", { p_secret: secret });
    return !error && data === true;
  }
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return false;
  const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
  return isAdmin === true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const startedAt = Date.now();
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    if (!(await isAuthorized(req, admin))) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit ?? 8) || 8, 1), 20);
    const recentOnly = body.recentOnly === true;

    const { data: jobs, error: claimError } = await admin.rpc("claim_catalog_image_thumbs", {
      p_limit: limit,
      p_recent_only: recentOnly,
    });
    if (claimError) {
      console.error("catalog-thumbs: claim failed:", claimError.message);
      return json({ error: "claim failed" }, 500);
    }

    const queue = [...((jobs ?? []) as Array<{ src_hash: string; src_url: string }>)];
    const results: Array<Record<string, unknown>> = [];
    const released: string[] = [];
    let cpuMs = 0;

    const worker = async () => {
      while (queue.length > 0) {
        const job = queue.shift()!;
        if (Date.now() - startedAt > TIME_BUDGET_MS || cpuMs > CPU_BUDGET_MS) {
          // 時間・CPU の使い切り。手を付けずに返して、次の呼び出しがすぐ拾えるようにする
          released.push(job.src_hash);
          continue;
        }
        const t0 = Date.now();
        try {
          const src = await fetchSource(job.src_url);
          const fetchedMs = Date.now() - t0;
          await ensureMagick();
          const thumb = toThumb(src);
          const convertMs = Date.now() - t0 - fetchedMs;
          cpuMs += convertMs;

          const { error: upError } = await admin.storage
            .from(BUCKET)
            .upload(`${PATH_VERSION}/${job.src_hash}.webp`, thumb.data, {
              contentType: "image/webp",
              cacheControl: "31536000",
              upsert: true,
            });
          if (upError) throw new Error(`upload: ${upError.message}`);

          await admin
            .from("catalog_image_thumbs")
            .update({
              status: "ok",
              width: thumb.width,
              height: thumb.height,
              bytes: thumb.data.byteLength,
              orig_bytes: src.byteLength,
              error: null,
              updated_at: new Date().toISOString(),
            })
            .eq("src_hash", job.src_hash);
          results.push({
            hash: job.src_hash,
            ok: true,
            orig: src.byteLength,
            thumb: thumb.data.byteLength,
            fetchMs: fetchedMs,
            convertMs,
          });
        } catch (e) {
          const permanent = e instanceof PermanentError;
          const message = (e instanceof Error ? e.message : String(e)).slice(0, 200);
          await admin
            .from("catalog_image_thumbs")
            .update({
              status: "failed",
              error: message,
              // やり直しても同じ失敗は、再試行の対象（attempts < 3）から外す
              ...(permanent ? { attempts: 99 } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq("src_hash", job.src_hash);
          results.push({ hash: job.src_hash, ok: false, error: message, ms: Date.now() - t0 });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

    if (released.length > 0) {
      // 「途中で止まった取得」と同じ扱いにして、次の呼び出しですぐ拾い直させる
      await admin
        .from("catalog_image_thumbs")
        .update({ claimed_at: new Date(0).toISOString() })
        .in("src_hash", released)
        .eq("status", "processing");
    }

    const okCount = results.filter((r) => r.ok).length;
    console.log(
      `catalog-thumbs: claimed=${jobs?.length ?? 0} ok=${okCount} failed=${results.length - okCount} ` +
        `released=${released.length} cpuMs=${cpuMs} ms=${Date.now() - startedAt}`,
    );
    return json({
      claimed: jobs?.length ?? 0,
      ok: okCount,
      failed: results.length - okCount,
      released: released.length,
      cpuMs,
      ms: Date.now() - startedAt,
      results,
    });
  } catch (error) {
    console.error("catalog-thumbs failed:", error);
    return json({ error: "unexpected error" }, 500);
  }
});
