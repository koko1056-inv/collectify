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
  // supabase storage expects a filename; default to png
  return "png";
}

export async function ensureProfileImagesPublicUrl(params: {
  userId: string;
  sourceUrl: string;
}) {
  const { userId, sourceUrl } = params;
  if (!sourceUrl) throw new Error("sourceUrl is empty");

  // 既に自前ストレージのpublic URLならそのまま使う
  if (isProfileImagesPublicUrl(sourceUrl)) return sourceUrl;

  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch avatar image: ${res.status}`);
  }

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

export async function setCurrentAvatar(params: {
  userId: string;
  avatarUrl: string;
  avatarGalleryId?: string;
  prompt?: string | null;
  itemIds?: string[] | null;
  name?: string | null;
}) {
  const { userId, avatarUrl, avatarGalleryId, prompt, itemIds, name } = params;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);

  if (profileError) throw profileError;

  // すべてのアバターの is_current を false に
  const { error: resetError } = await supabase
    .from("avatar_gallery")
    .update({ is_current: false })
    .eq("user_id", userId);

  if (resetError) throw resetError;

  if (avatarGalleryId) {
    const updateData: Record<string, unknown> = {
      image_url: avatarUrl,
      is_current: true,
    };
    if (prompt !== undefined) updateData.prompt = prompt;
    if (itemIds !== undefined) updateData.item_ids = itemIds;
    if (name !== undefined) updateData.name = name;

    const { error: galleryError } = await supabase
      .from("avatar_gallery")
      .update(updateData)
      .eq("id", avatarGalleryId);

    if (galleryError) throw galleryError;
    return;
  }

  const { error: insertError } = await supabase.from("avatar_gallery").insert({
    user_id: userId,
    image_url: avatarUrl,
    is_current: true,
    prompt: prompt ?? null,
    item_ids: itemIds ?? null,
    name: name ?? null,
  });

  if (insertError) throw insertError;
}
