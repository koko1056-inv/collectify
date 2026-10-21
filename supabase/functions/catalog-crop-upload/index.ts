import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

/**
 * オフラインで切り出したカタログ画像（catalog_upload_staging に溜めた base64）を
 * 公開バケット kuji_images に取り込む。
 *
 * 【安全のための決まり】
 * - 呼べるのは合言葉（x-upload-secret）か管理者（JWT + has_role('admin')）だけ
 * - パス・content_type・サイズ・先頭バイト（マジックナンバー）を、DBに入っている値を信用せず
 *   ここでも検査し直す
 * - 既に同じパスにオブジェクトがあれば upsert せず失敗にする（上書きしない）
 * - service_role キーはこの関数の中（Supabase の中）にしかなく、呼び出し側には渡らない
 *
 * 【呼び出し】
 *   POST /functions/v1/catalog-crop-upload   { "limit": 20 }
 *   SQL エディタから select public.run_catalog_crop_upload(20); を呼ぶと、ここが x-upload-secret 付きで叩かれる。
 *
 * 【crop モード】
 * mode: "crop" を body に付けると、元画像のURLから切り出し・パディング・リサイズをここで行い、
 * 同じ kuji_images に置く。public.catalog_crop_jobs に溜めた行（batch 単位）を拾うか、
 * body.items で直接渡す（管理者用、最大10件）。official_items は一切更新しない。
 *   POST /functions/v1/catalog-crop-upload   { "mode": "crop", "batch": "...", "limit": 10 }
 *   select public.run_catalog_crop_jobs('batch', 10); を呼ぶと、ここが x-upload-secret 付きで叩かれる。
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-upload-secret",
};

const BUCKET = "kuji_images";
const MAX_LIMIT = 50;
const MAX_BYTES = 2 * 1024 * 1024;
const PATH_RE = /^catalog-crops\/[A-Za-z0-9._/-]+\.(jpg|png|webp)$/;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// ─── crop モード用の定数 ───
const CROP_ALLOWED_HOSTS = new Set(["cdn.shopify.com"]);
const CROP_PATH_RE = /^catalog-crops\/[A-Za-z0-9._/-]+\.jpg$/;
const PAD_COLOR_RE = /^#[0-9a-f]{6}$/;
const CROP_MIN_DIM = 1;
const CROP_MAX_DIM = 8000;
const CROP_MAX_CLIP_PX = 2;
const CROP_FETCH_TIMEOUT_MS = 15_000;
const CROP_MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const CROP_MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const CROP_MAX_OUTPUT_SIDE = 800;
const CROP_JPEG_QUALITY = 90;
const CROP_MAX_BATCH = 10;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** 先頭バイトが content_type の形式と一致するか（JPEG/PNG/WEBP だけ） */
function magicBytesMatch(bytes: Uint8Array, contentType: string): boolean {
  const at = (offset: number, sig: number[]) => sig.every((v, i) => bytes[offset + i] === v);
  if (contentType === "image/jpeg") return at(0, [0xff, 0xd8, 0xff]);
  if (contentType === "image/png") return at(0, [0x89, 0x50, 0x4e, 0x47]);
  if (contentType === "image/webp") {
    return at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50]);
  }
  return false;
}

function isValidPath(path: string): boolean {
  return PATH_RE.test(path) && !path.includes("..") && !path.includes("//");
}

async function isAuthorized(req: Request, admin: ReturnType<typeof createClient>): Promise<boolean> {
  const secret = req.headers.get("x-upload-secret");
  if (secret) {
    const { data, error } = await admin.rpc("catalog_crop_upload_secret_ok", { p_secret: secret });
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

// ─── crop モードのヘルパー ───

function isValidCropDestPath(path: string): boolean {
  return CROP_PATH_RE.test(path) && !path.includes("..") && !path.includes("//");
}

function isValidCropSourceUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!CROP_ALLOWED_HOSTS.has(url.hostname)) return null;
  return url;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** レスポンス本体を、maxBytes を超えたら読むのをやめて失敗にする */
async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) {
    const buf = new Uint8Array(await response.arrayBuffer());
    if (buf.byteLength > maxBytes) throw new Error("too large");
    return buf;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new Error("too large");
      }
      chunks.push(value);
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

interface CropJob {
  id: number | null;
  official_item_id: string;
  source_url: string;
  crop_x: number;
  crop_y: number;
  crop_w: number;
  crop_h: number;
  pad_color: string;
  dest_path: string;
}

interface CropOutcome {
  status: "done" | "failed";
  error?: string;
  width?: number;
  height?: number;
  bytes?: number;
  encoded?: Uint8Array;
}

function normalizeDirectItem(raw: Record<string, unknown>): CropJob {
  const crop = (raw.crop ?? {}) as Record<string, unknown>;
  return {
    id: null,
    official_item_id: String(raw.official_item_id ?? ""),
    source_url: String(raw.source_url ?? ""),
    crop_x: Number(crop.x),
    crop_y: Number(crop.y),
    crop_w: Number(crop.w),
    crop_h: Number(crop.h),
    pad_color: typeof raw.pad_color === "string" ? raw.pad_color : "#ffffff",
    dest_path: String(raw.dest_path ?? ""),
  };
}

async function processCropJob(job: CropJob): Promise<CropOutcome> {
  const url = isValidCropSourceUrl(job.source_url);
  if (!url) return { status: "failed", error: "source_url not allowed" };
  if (!isValidCropDestPath(job.dest_path)) return { status: "failed", error: "invalid dest_path" };
  if (!PAD_COLOR_RE.test(job.pad_color)) return { status: "failed", error: "invalid pad_color" };
  if (
    !Number.isInteger(job.crop_x) || !Number.isInteger(job.crop_y) ||
    !Number.isInteger(job.crop_w) || !Number.isInteger(job.crop_h) ||
    job.crop_x < 0 || job.crop_y < 0 ||
    job.crop_w < CROP_MIN_DIM || job.crop_w > CROP_MAX_DIM ||
    job.crop_h < CROP_MIN_DIM || job.crop_h > CROP_MAX_DIM
  ) {
    return { status: "failed", error: "invalid crop" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CROP_FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url.toString(), { redirect: "manual", signal: controller.signal });
  } catch (e) {
    return { status: "failed", error: `fetch failed: ${String(e).slice(0, 100)}` };
  } finally {
    clearTimeout(timer);
  }

  if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
    await response.body?.cancel().catch(() => {});
    return { status: "failed", error: "redirect not allowed" };
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    return { status: "failed", error: `fetch http ${response.status}` };
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    await response.body?.cancel().catch(() => {});
    return { status: "failed", error: `not an image: ${contentType}` };
  }
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > CROP_MAX_SOURCE_BYTES) {
    await response.body?.cancel().catch(() => {});
    return { status: "failed", error: "source too large" };
  }

  let bytes: Uint8Array;
  try {
    bytes = await readCapped(response, CROP_MAX_SOURCE_BYTES);
  } catch {
    return { status: "failed", error: "source too large" };
  }

  let img: Image;
  try {
    const decoded = await Image.decode(bytes);
    if (Array.isArray(decoded)) return { status: "failed", error: "unsupported animated image" };
    img = decoded;
  } catch (e) {
    return { status: "failed", error: `decode failed: ${String(e).slice(0, 100)}` };
  }

  let { crop_x: cx, crop_y: cy, crop_w: cw, crop_h: ch } = job;
  if (cx >= img.width || cy >= img.height) return { status: "failed", error: "crop out of bounds" };
  const overX = cx + cw - img.width;
  if (overX > 0) {
    if (overX > CROP_MAX_CLIP_PX) return { status: "failed", error: "crop out of bounds" };
    cw -= overX;
  }
  const overY = cy + ch - img.height;
  if (overY > 0) {
    if (overY > CROP_MAX_CLIP_PX) return { status: "failed", error: "crop out of bounds" };
    ch -= overY;
  }
  if (cw <= 0 || ch <= 0) return { status: "failed", error: "crop out of bounds" };

  img.crop(cx, cy, cw, ch);

  const side = Math.max(img.width, img.height);
  const [r, g, b] = hexToRgb(job.pad_color);
  const canvas = new Image(side, side);
  canvas.fill(Image.rgbToColor(r, g, b));
  const offsetX = Math.floor((side - img.width) / 2);
  const offsetY = Math.floor((side - img.height) / 2);
  canvas.composite(img, offsetX, offsetY);

  if (side > CROP_MAX_OUTPUT_SIDE) {
    canvas.resize(CROP_MAX_OUTPUT_SIDE, CROP_MAX_OUTPUT_SIDE);
  }

  const encoded = await canvas.encodeJPEG(CROP_JPEG_QUALITY);
  if (encoded.byteLength > CROP_MAX_OUTPUT_BYTES) {
    return { status: "failed", error: "output too large" };
  }

  return {
    status: "done",
    width: canvas.width,
    height: canvas.height,
    bytes: encoded.byteLength,
    encoded,
  };
}

async function handleCropMode(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
): Promise<Response> {
  const startedAt = Date.now();
  let jobs: CropJob[];

  if (Array.isArray(body.items)) {
    if (body.items.length === 0) return json({ claimed: 0, ok: 0, failed: 0, results: [] });
    if (body.items.length > CROP_MAX_BATCH) {
      return json({ error: `too many items (max ${CROP_MAX_BATCH})` }, 400);
    }
    jobs = (body.items as Array<Record<string, unknown>>).map(normalizeDirectItem);
  } else {
    const batch = typeof body.batch === "string" ? body.batch : "";
    if (!batch) return json({ error: "batch required" }, 400);
    const limit = Math.min(Math.max(Number(body.limit ?? CROP_MAX_BATCH) || CROP_MAX_BATCH, 1), CROP_MAX_BATCH);

    const { data: pending, error: selectError } = await admin
      .from("catalog_crop_jobs")
      .select("id, official_item_id, source_url, crop_x, crop_y, crop_w, crop_h, pad_color, dest_path")
      .eq("batch", batch)
      .eq("status", "pending")
      .order("id", { ascending: true })
      .limit(limit);
    if (selectError) {
      console.error("catalog-crop-upload(crop): select failed:", selectError.message);
      return json({ error: "select failed" }, 500);
    }

    jobs = (pending ?? []) as unknown as CropJob[];
    if (jobs.length > 0) {
      const { error: claimError } = await admin
        .from("catalog_crop_jobs")
        .update({ status: "running" })
        .in("id", jobs.map((j) => j.id));
      if (claimError) {
        console.error("catalog-crop-upload(crop): claim failed:", claimError.message);
        return json({ error: "claim failed" }, 500);
      }
    }
  }

  const results: Array<
    { id: number | null; dest_path: string; status: "done" | "failed"; error?: string; width?: number; height?: number; bytes?: number }
  > = [];

  for (const job of jobs) {
    const outcome = await processCropJob(job);

    let finalStatus = outcome.status;
    let finalError = outcome.error;

    if (finalStatus === "done" && outcome.encoded) {
      const { error: upError } = await admin.storage
        .from(BUCKET)
        .upload(job.dest_path, outcome.encoded, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: false,
        });
      if (upError) {
        const exists = /already exists|Duplicate/i.test(upError.message);
        finalStatus = "failed";
        finalError = exists ? "exists" : `upload: ${upError.message}`.slice(0, 200);
      }
    }

    if (job.id !== null) {
      await admin
        .from("catalog_crop_jobs")
        .update({
          status: finalStatus,
          error: finalError ?? null,
          done_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    results.push({
      id: job.id,
      dest_path: job.dest_path,
      status: finalStatus,
      ...(finalError ? { error: finalError } : {}),
      ...(finalStatus === "done" ? { width: outcome.width, height: outcome.height, bytes: outcome.bytes } : {}),
    });
  }

  const ok = results.filter((r) => r.status === "done").length;
  console.log(
    `catalog-crop-upload(crop): claimed=${jobs.length} ok=${ok} failed=${results.length - ok} ms=${Date.now() - startedAt}`,
  );
  return json({ claimed: jobs.length, ok, failed: results.length - ok, results });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    if (!(await isAuthorized(req, admin))) return json({ error: "Forbidden" }, 401);

    const body = await req.json().catch(() => ({}));

    if (body.mode === "crop") {
      return await handleCropMode(admin, body);
    }

    const limit = Math.min(Math.max(Number(body.limit ?? 20) || 20, 1), MAX_LIMIT);

    const { data: rows, error: selectError } = await admin
      .from("catalog_upload_staging")
      .select("id, path, content_type, data_b64")
      .eq("status", "pending")
      .order("id", { ascending: true })
      .limit(limit);
    if (selectError) {
      console.error("catalog-crop-upload: select failed:", selectError.message);
      return json({ error: "select failed" }, 500);
    }

    const queue = (rows ?? []) as Array<
      { id: number; path: string; content_type: string; data_b64: string | null }
    >;
    const results: Array<{ id: number; path: string; status: "done" | "failed"; error?: string }> = [];

    for (const row of queue) {
      const fail = async (error: string) => {
        await admin
          .from("catalog_upload_staging")
          .update({ status: "failed", error, data_b64: null, done_at: new Date().toISOString() })
          .eq("id", row.id);
        results.push({ id: row.id, path: row.path, status: "failed", error });
      };

      if (!isValidPath(row.path)) {
        await fail("invalid path");
        continue;
      }
      if (!ALLOWED_CONTENT_TYPES.has(row.content_type)) {
        await fail("invalid content_type");
        continue;
      }
      if (!row.data_b64) {
        await fail("missing data");
        continue;
      }

      let bytes: Uint8Array;
      try {
        bytes = Uint8Array.from(atob(row.data_b64), (c) => c.charCodeAt(0));
      } catch {
        await fail("invalid base64");
        continue;
      }

      if (bytes.byteLength > MAX_BYTES) {
        await fail("too large");
        continue;
      }
      if (!magicBytesMatch(bytes, row.content_type)) {
        await fail("magic bytes mismatch");
        continue;
      }

      const { error: upError } = await admin.storage
        .from(BUCKET)
        .upload(row.path, bytes, {
          contentType: row.content_type,
          cacheControl: "31536000",
          upsert: false,
        });
      if (upError) {
        const exists = /already exists|Duplicate/i.test(upError.message);
        await fail(exists ? "exists" : `upload: ${upError.message}`.slice(0, 200));
        continue;
      }

      await admin
        .from("catalog_upload_staging")
        .update({ status: "done", error: null, data_b64: null, bytes: bytes.byteLength, done_at: new Date().toISOString() })
        .eq("id", row.id);
      results.push({ id: row.id, path: row.path, status: "done" });
    }

    const ok = results.filter((r) => r.status === "done").length;
    console.log(`catalog-crop-upload: claimed=${queue.length} ok=${ok} failed=${results.length - ok}`);
    return json({ claimed: queue.length, ok, failed: results.length - ok, results });
  } catch (error) {
    console.error("catalog-crop-upload failed:", error);
    return json({ error: "unexpected error" }, 500);
  }
});
