// ユーザー名＋秘密の質問によるパスワード再設定。
//
// ログイン前（JWTなし）に呼ばれる。本人確認は「秘密の質問」の答えで行い、正しければ
// service role の auth.admin.updateUserById() でパスワードを変更し、既存のセッションを失効させる。
//
// セッション失効について: auth.admin.signOut(token, scope) は「ユーザーID」ではなく
// 「アクセストークン（JWT）」を受け取る API で、ユーザーIDを渡しても失効しない（エラーになるだけ）。
// そのため、パスワード変更後に新しいパスワードで一度だけ signInWithPassword し、
// そこで得たアクセストークンを 'global' スコープで signOut することで、そのユーザーの
// 全セッション（このサインインで作った分も含む）をまとめて失効させている。詳細は handleReset 参照。
//
// action:
//   lookup: { username } -> { ok: true, question_id } | { ok: false, reason: 'unavailable' }
//   reset:  { username, answer, new_password }
//           -> { ok: true } | { ok: false, reason: 'mismatch_or_locked' | 'unavailable' | 'weak_password' }
//
// ユーザー名が存在しない・秘密の質問が未設定・サンプルアカウントは、どれも区別せず
// 'unavailable' にする（列挙対策。ただし質問文そのものを見せる以上、ユーザー名の存在は
// 多少推測され得る。PR本文の「セキュリティ上の考慮」に限界として明記する）。
//
// レート制限（secret_reset_attempts に記録、secret_reset_check_lock で判定）:
//   ・同じユーザー名で reset 失敗が1時間に5回 → 1時間ロック
//   ・同じIPで reset 失敗が1時間に10回、または lookup が1時間に30回 → 1時間ロック
//   ロック中は答えの検証そのものを行わない（crypt() すら呼ばない）。

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, jsonResponse, readJson } from "../_shared/security.ts";

const MIN_PASSWORD_LENGTH = 6; // src/components/PasswordRequirements.tsx と同じ基準
const MAX_FIELD_LENGTH = 200; // 異常に長い入力を早期に弾く（DoS対策というより事故防止）

type Action = "lookup" | "reset";

function isNonEmptyString(v: unknown, maxLen = MAX_FIELD_LENGTH): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.length <= maxLen;
}

/** x-forwarded-for の先頭、無ければ cf-connecting-ip。どちらも無ければ null。 */
function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("cf-connecting-ip");
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

let warnedMissingPepper = false;

/** IP を service 側のペッパーつきで SHA-256 する。ペッパー未設定時は素の SHA-256（1回だけ警告）。 */
async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const pepper = Deno.env.get("SECRET_RESET_PEPPER");
  if (!pepper) {
    if (!warnedMissingPepper) {
      console.warn(
        "secret-question-reset: SECRET_RESET_PEPPER is not set; hashing IPs without a secret pepper (less resistant to offline guessing of raw IPs from the hash)."
      );
      warnedMissingPepper = true;
    }
    return await sha256Hex(ip);
  }
  return await sha256Hex(`${pepper}:${ip}`);
}

serve(async (req) => {
  const cors = corsHeadersFor(req);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return jsonResponse(cors, { ok: false, reason: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) {
    console.error(
      "secret-question-reset: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY is not configured"
    );
    return jsonResponse(cors, { ok: false, reason: "server_misconfigured" }, 500);
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const body = await readJson(req);
  if (!body) return jsonResponse(cors, { ok: false, reason: "invalid_json" }, 400);

  const action = body.action as Action;
  if (action !== "lookup" && action !== "reset") {
    return jsonResponse(cors, { ok: false, reason: "invalid_action" }, 400);
  }
  if (!isNonEmptyString(body.username)) {
    return jsonResponse(cors, { ok: false, reason: "invalid_username" }, 400);
  }
  const username = (body.username as string).trim();
  const ipHash = await hashIp(clientIp(req));

  try {
    if (action === "lookup") {
      return await handleLookup(admin, cors, username, ipHash);
    }
    if (!isNonEmptyString(body.answer) || !isNonEmptyString(body.new_password)) {
      return jsonResponse(cors, { ok: false, reason: "invalid_input" }, 400);
    }
    return await handleReset(
      admin,
      cors,
      username,
      body.answer as string,
      body.new_password as string,
      ipHash,
      url,
      anonKey
    );
  } catch (e) {
    console.error("secret-question-reset failed:", e);
    return jsonResponse(cors, { ok: false, reason: "internal_error" }, 500);
  }
});

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

async function handleLookup(admin: AdminClient, cors: Record<string, string>, username: string, ipHash: string | null) {
  const locked = await isLocked(admin, username, ipHash);
  if (locked) {
    await logEvent(admin, null, username, "locked", ipHash);
    // ロック中は、答えの検証はおろか lookup 自体の結果も返さない（unavailable と区別させない）
    return jsonResponse(cors, { ok: false, reason: "unavailable" }, 200);
  }

  const { data, error } = await admin.rpc("secret_reset_lookup", { _username: username });
  if (error) {
    console.error("secret_reset_lookup failed:", error);
    return jsonResponse(cors, { ok: false, reason: "internal_error" }, 500);
  }
  const row = Array.isArray(data) ? data[0] : null;
  await recordAttempt(admin, username, ipHash, "lookup", !!row);

  if (!row) {
    await logEvent(admin, null, username, "unavailable", ipHash);
    return jsonResponse(cors, { ok: false, reason: "unavailable" }, 200);
  }
  await logEvent(admin, row.user_id, username, "lookup", ipHash);
  return jsonResponse(cors, { ok: true, question_id: row.question_id }, 200);
}

async function handleReset(
  admin: AdminClient,
  cors: Record<string, string>,
  username: string,
  answer: string,
  newPassword: string,
  ipHash: string | null,
  supabaseUrl: string,
  anonKey: string
) {
  const locked = await isLocked(admin, username, ipHash);
  if (locked) {
    await logEvent(admin, null, username, "locked", ipHash);
    return jsonResponse(cors, { ok: false, reason: "mismatch_or_locked" }, 200);
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return jsonResponse(cors, { ok: false, reason: "weak_password" }, 200);
  }

  const { data: lookupData, error: lookupError } = await admin.rpc("secret_reset_lookup", { _username: username });
  if (lookupError) {
    console.error("secret_reset_lookup failed:", lookupError);
    return jsonResponse(cors, { ok: false, reason: "internal_error" }, 500);
  }
  const row = Array.isArray(lookupData) ? lookupData[0] : null;

  // row が無くても、同じだけ crypt() にかかる時間を使わせる（存在しないユーザーかどうかを
  // レスポンス時間の差で推測されないようにする）。_user_id が null のときは
  // secret_reset_verify がダミーの crypt() を実行して常に false を返す。
  const { data: verified, error: verifyError } = await admin.rpc("secret_reset_verify", {
    _user_id: row?.user_id ?? null,
    _answer: answer,
  });
  if (verifyError) {
    console.error("secret_reset_verify failed:", verifyError);
    return jsonResponse(cors, { ok: false, reason: "internal_error" }, 500);
  }

  if (!verified) {
    await recordAttempt(admin, username, ipHash, "reset", false);
    await logEvent(admin, row?.user_id ?? null, username, "failure", ipHash);
    return jsonResponse(cors, { ok: false, reason: row ? "mismatch_or_locked" : "unavailable" }, 200);
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(row.user_id, { password: newPassword });
  if (updateError) {
    console.error("updateUserById failed:", updateError);
    return jsonResponse(cors, { ok: false, reason: "internal_error" }, 500);
  }

  // 既存のセッション（トークン）を失効させる。
  //
  // auth.admin.signOut(token, scope) は「ユーザーID」ではなく「アクセストークン」を受け取る API。
  // user_id を渡しても失効しない（エラーになるだけで、変更前のパスワードで発行済みの
  // セッションがすべて残ってしまう）。そこで、変更後の新パスワードで一度だけ signInWithPassword し、
  // そこで得たアクセストークンを 'global' スコープで signOut することで、そのユーザーの全セッション
  // （この一度きりのサインインで作った分も含む）を失効させる。
  //
  // email は username@example.com 方式を前提に推測せず、getUserById で実際の値を取得する。
  // 失敗してもパスワード変更自体は成功扱いにする（本人は新しいパスワードで入り直せる。
  // 失効漏れのログだけ残す。パスワードはログに出さない）。
  try {
    const { data: userRes, error: getUserError } = await admin.auth.admin.getUserById(row.user_id);
    const email = userRes?.user?.email;
    if (getUserError || !email) throw getUserError ?? new Error("user has no email");

    // persistSession/autoRefreshToken: false の使い捨てクライアント。
    // この Edge Function 内だけで使い、アクセストークンを得たらすぐ signOut する。
    const ephemeral = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signInData, error: signInError } = await ephemeral.auth.signInWithPassword({
      email,
      password: newPassword,
    });
    const accessToken = signInData?.session?.access_token;
    if (signInError || !accessToken) throw signInError ?? new Error("sign-in after reset returned no session");

    const { error: signOutError } = await admin.auth.admin.signOut(accessToken, "global");
    if (signOutError) throw signOutError;
  } catch (e) {
    console.error("secret-question-reset: session revocation after reset failed (ignored):", e);
  }

  await recordAttempt(admin, username, ipHash, "reset", true);
  await logEvent(admin, row.user_id, username, "success", ipHash);
  return jsonResponse(cors, { ok: true }, 200);
}

async function isLocked(admin: AdminClient, username: string, ipHash: string | null): Promise<boolean> {
  const { data, error } = await admin.rpc("secret_reset_check_lock", { _username_norm: username, _ip_hash: ipHash });
  if (error) {
    console.error("secret_reset_check_lock failed:", error);
    // 判定できないときは安全側（ロックしない）に倒すと悪用され得るため、ロックする
    return true;
  }
  return data === true;
}

async function recordAttempt(admin: AdminClient, username: string, ipHash: string | null, action: Action, success: boolean) {
  const { error } = await admin.rpc("secret_reset_record_attempt", {
    _username_norm: username,
    _ip_hash: ipHash,
    _action: action,
    _success: success,
  });
  if (error) console.error("secret_reset_record_attempt failed:", error);
}

async function logEvent(
  admin: AdminClient,
  userId: string | null,
  username: string,
  event: "lookup" | "success" | "failure" | "locked" | "unavailable",
  ipHash: string | null
) {
  const { error } = await admin.rpc("secret_reset_log_event", {
    _user_id: userId,
    _username_norm: username,
    _event: event,
    _ip_hash: ipHash,
  });
  if (error) console.error("secret_reset_log_event failed:", error);
}
