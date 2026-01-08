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
  skipGalleryInsert?: boolean; // DBトリガーで自動追加される場合はtrue
}) {
  const { userId, avatarUrl, avatarGalleryId, prompt, itemIds, name, skipGalleryInsert } = params;

  // すべてのアバターの is_current を false に（先に実行）
  const { error: resetError } = await supabase
    .from("avatar_gallery")
    .update({ is_current: false })
    .eq("user_id", userId);

  if (resetError) throw resetError;

  // プロフィールを更新（DBトリガーで avatar_gallery に追加される）
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);

  if (profileError) throw profileError;

  // 既存のギャラリーIDがある場合は更新
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

  // skipGalleryInsert=trueの場合、DBトリガーで追加されるため手動挿入をスキップ
  // トリガーで作成されたエントリのpromptを更新
  if (skipGalleryInsert) {
    // トリガーで作成されたエントリを更新
    await new Promise(resolve => setTimeout(resolve, 100)); // トリガー処理待ち
    const { error: updateError } = await supabase
      .from("avatar_gallery")
      .update({ 
        prompt: prompt ?? null,
        item_ids: itemIds ?? null,
        name: name ?? null 
      })
      .eq("user_id", userId)
      .eq("image_url", avatarUrl);

    if (updateError) console.error("Gallery update error:", updateError);
    return;
  }

  // 手動で挿入（トリガーがない場合のフォールバック）
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
