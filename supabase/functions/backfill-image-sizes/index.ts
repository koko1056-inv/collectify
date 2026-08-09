import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
} from "https://deno.land/x/imagemagick_deno@0.0.26/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * 既にアップロード済みの大きな画像を、その場で縮小して置き換える。
 *
 * 圧縮を入れたのは登録処理側なので、それ以前に上げた画像は
 * 元のサイズのまま残っている。表示は画像変換で軽くできるが、
 * ストレージ容量と、変換を通らない経路では重いままなので、
 * 実体そのものを縮めておきたい。
 *
 * 【安全のための決まり】
 * - 管理者しか実行できない
 * - 1回の呼び出しで少しずつ処理する（タイムアウトと負荷を避ける）
 * - 同じパスに上書きする。URLが変わらないので DB は触らなくてよい
 * - 縮めた結果が元より大きい場合はそのままにする
 * - 1枚失敗しても止めず、結果に含めて返す
 * - dryRun=true なら書き込まず、どれが対象かだけ返す
 *
 * 呼び出し例:
 *   POST /functions/v1/backfill-image-sizes
 *   { "bucket": "kuji_images", "limit": 50, "dryRun": true }
 *
 * dryRun で件数と削減見込みを確認してから、dryRun を外して繰り返し実行する。
 * 返り値の done が true になったら、そのバケットは完了。
 */

const MAX_EDGE = 1600;
const QUALITY = 82;
/** これより小さい画像は触らない（縮めても得が少ない） */
const SKIP_UNDER_BYTES = 300 * 1024;

let magickReady = false;
async function ensureMagick() {
  if (!magickReady) {
    await initializeImageMagick();
    magickReady = true;
  }
}

async function shrink(bytes: Uint8Array): Promise<Uint8Array | null> {
  await ensureMagick();
  return await new Promise((resolve) => {
    try {
      ImageMagick.read(bytes, (img) => {
        const longest = Math.max(img.width, img.height);
        if (longest > MAX_EDGE) {
          const scale = MAX_EDGE / longest;
          img.resize(Math.round(img.width * scale), Math.round(img.height * scale));
        }
        img.quality = QUALITY;
        img.write(MagickFormat.Jpeg, (out) => resolve(new Uint8Array(out)));
      });
    } catch (e) {
      console.error("shrink failed:", e);
      resolve(null);
    }
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authorization header is required" }, 401);

    // 呼び出し元の本人確認
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    // 全利用者の画像を書き換える操作なので、管理者だけに限る
    const { data: isAdmin, error: roleError } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleError || !isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const bucket: string = body.bucket ?? "kuji_images";
    const limit: number = Math.min(Number(body.limit ?? 25), 100);
    const offset: number = Number(body.offset ?? 0);
    const prefix: string = body.prefix ?? "";
    const dryRun: boolean = body.dryRun !== false; // 既定は安全側（書き込まない）

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: files, error: listError } = await admin.storage
      .from(bucket)
      .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
    if (listError) return json({ error: listError.message }, 500);

    const results: Array<Record<string, unknown>> = [];
    let savedBytes = 0;

    for (const f of files ?? []) {
      // list はフォルダも返す。中身が無いものは飛ばす
      const size = (f.metadata as { size?: number } | null)?.size ?? 0;
      const mime = (f.metadata as { mimetype?: string } | null)?.mimetype ?? "";
      const path = prefix ? `${prefix}/${f.name}` : f.name;

      if (!size) continue;
      if (!mime.startsWith("image/") || mime === "image/gif" || mime === "image/svg+xml") continue;
      if (size < SKIP_UNDER_BYTES) continue;

      if (dryRun) {
        results.push({ path, size, action: "would_shrink" });
        continue;
      }

      const { data: blob, error: dlError } = await admin.storage.from(bucket).download(path);
      if (dlError || !blob) {
        results.push({ path, size, action: "download_failed" });
        continue;
      }

      const shrunk = await shrink(new Uint8Array(await blob.arrayBuffer()));
      if (!shrunk) {
        results.push({ path, size, action: "convert_failed" });
        continue;
      }
      if (shrunk.byteLength >= size) {
        results.push({ path, size, action: "kept_original" });
        continue;
      }

      // 同じパスに上書きするので、DB に入っているURLは変わらない
      const { error: upError } = await admin.storage
        .from(bucket)
        .upload(path, shrunk, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: true,
        });
      if (upError) {
        results.push({ path, size, action: "upload_failed", detail: upError.message });
        continue;
      }

      savedBytes += size - shrunk.byteLength;
      results.push({ path, before: size, after: shrunk.byteLength, action: "shrunk" });
    }

    return json({
      bucket,
      prefix,
      offset,
      limit,
      dryRun,
      scanned: files?.length ?? 0,
      processed: results.length,
      savedBytes,
      // 返ってきた件数が limit 未満なら、そのバケットは走査し終わり
      done: (files?.length ?? 0) < limit,
      nextOffset: offset + (files?.length ?? 0),
      results,
    });
  } catch (error) {
    console.error("backfill-image-sizes failed:", error);
    return json({ error: "unexpected error" }, 500);
  }
});
