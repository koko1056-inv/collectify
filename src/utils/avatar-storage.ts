import { supabase } from "@/integrations/supabase/client";

export const PROFILE_IMAGES_BUCKET = "profile_images" as const;

export function isProfileImagesPublicUrl(url: string) {
  return url.includes("/storage/v1/object/public/profile_images/");
}

function guessExtFromContentType(contentType: string | undefined) {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("image/jpeg")) return "jpg";
  if (ct.includes("image/webp")) return "webp";
  if (ct.includes("image/png")) return "png";
  return "png";
}

/**
 * 外部URL（AI生成APIなど）の画像を自前ストレージにコピーし、
 * 安定的なpublic URLを返す。すでに自前ストレージのURLならそのまま返す。
 */
export async function ensureProfileImagesPublicUrl(params: {
  userId: string;
  sourceUrl: string;
}): Promise<string> {
  const { userId, sourceUrl } = params;
  if (!sourceUrl) throw new Error("sourceUrl is empty");
  if (isProfileImagesPublicUrl(sourceUrl)) return sourceUrl;

  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Failed to fetch avatar image: ${res.status}`);

  const blob = await res.blob();
  const contentType = blob.type || "image/png";
  const ext = guessExtFromContentType(contentType);
  const filePath = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(filePath, blob, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
