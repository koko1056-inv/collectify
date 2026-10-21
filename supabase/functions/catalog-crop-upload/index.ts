import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
