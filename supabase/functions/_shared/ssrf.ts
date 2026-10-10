// SSRF 対策を1か所にまとめる
//
// ユーザーが渡した URL をサーバー側から取りに行く関数（scrape-images / proxy-image /
// post-to-twitter など）が、社内ネットワークやクラウドのメタデータ
// （169.254.169.254）へ到達できてしまうのを防ぐ。
//
// やっていること
//   1. URL の形を検査する   … https のみ・認証情報なし・ポートは 443 のみ・IP 直指定は拒否
//                             （10進 / 16進 / 8進の数値ホスト名はすべて IP 直指定として弾く）
//   2. DNS を引いて検査する … A / AAAA の全件が公開アドレスであること
//   3. リダイレクトを自前で辿る … redirect: "manual" で最大3回。ホップごとに 1・2 をやり直す
//   4. 本文をストリームで読む … 上限を超えたら読むのをやめる
//
// 残るリスク: 検査で引いた DNS と fetch が内部で引く DNS は別の問い合わせなので、
// 検査の直後に DNS を書き換える攻撃（DNS rebinding）は理論上残る。Deno の fetch は
// 接続先 IP の固定ができないため。許可リストと併用して影響を小さくしている。
//
// このファイルは Deno 固有の API を関数の中でしか触らない。IP 判定などの純粋な関数は
// Node からも読み込めるので、scripts/test-ssrf-guard.mjs で検証している。

/** 呼び出し側にそのまま返してよい文言だけを message に入れる（内部の IP などは入れない）。 */
export class SsrfError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "SsrfError";
    this.status = status;
  }
}

// ────────────────────────────── IP アドレスの判定 ──────────────────────────────

function parseIPv4(ip: string): number[] | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((n) => n > 255)) return null;
  return parts;
}

/** 内部・予約・特殊用途の IPv4 なら true。解釈できない文字列も true（安全側）。 */
export function isPrivateIPv4(ip: string): boolean {
  const p = parseIPv4(ip);
  if (!p) return true;
  const [a, b, c] = p;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; // 127.0.0.0/8 ループバック
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 リンクローカル・メタデータ
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 ドキュメント用
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 ベンチマーク
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24
  if (a >= 224) return true; // 224.0.0.0/4 マルチキャスト + 240.0.0.0/4 予約 + ブロードキャスト
  return false;
}

/** IPv6 を 16bit x 8 に展開する。解釈できなければ null。 */
function parseIPv6(input: string): number[] | null {
  let s = input.replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();
  if (!s.includes(":")) return null;

  // 末尾が IPv4 表記（::ffff:1.2.3.4）なら、後で上書きする2グループに置き換えておく
  let tail: number[] | null = null;
  const m = s.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (m) {
    const v4 = parseIPv4(m[2]);
    if (!v4) return null;
    tail = [(v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3]];
    s = m[1] + "0:0";
  }

  const halves = s.split("::");
  if (halves.length > 2) return null;
  const toGroups = (part: string) => (part === "" ? [] : part.split(":"));
  const head = toGroups(halves[0]);
  let groups: string[];
  if (halves.length === 2) {
    const rest = toGroups(halves[1]);
    const missing = 8 - head.length - rest.length;
    if (missing < 1) return null;
    groups = [...head, ...Array(missing).fill("0"), ...rest];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;

  const out = groups.map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  if (out.some((n) => Number.isNaN(n))) return null;
  if (tail) {
    out[6] = tail[0];
    out[7] = tail[1];
  }
  return out;
}

function embeddedV4(hi: number, lo: number): string {
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

/** 内部・予約・特殊用途の IPv6 なら true。解釈できない文字列も true（安全側）。 */
export function isPrivateIPv6(ip: string): boolean {
  const g = parseIPv6(ip);
  if (!g) return true;

  // :: と ::1
  if (g.every((n) => n === 0)) return true;
  if (g.slice(0, 7).every((n) => n === 0) && g[7] === 1) return true;

  // ::ffff:a.b.c.d（IPv4 マップ）は埋め込まれた IPv4 で判定
  if (g.slice(0, 5).every((n) => n === 0) && g[5] === 0xffff) {
    return isPrivateIPv4(embeddedV4(g[6], g[7]));
  }
  // ::a.b.c.d（IPv4 互換・廃止済み）は使われないので拒否
  if (g.slice(0, 6).every((n) => n === 0)) return true;
  // 64:ff9b::/96（NAT64）も埋め込まれた IPv4 で判定
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((n) => n === 0)) {
    return isPrivateIPv4(embeddedV4(g[6], g[7]));
  }
  // 2002::/16（6to4）は2〜3番目のグループが IPv4
  if (g[0] === 0x2002) return isPrivateIPv4(embeddedV4(g[1], g[2]));
  // 2001::/32（Teredo）は IPv4 を埋め込めるので拒否
  if (g[0] === 0x2001 && g[1] === 0) return true;
  // 2001:db8::/32 ドキュメント用
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true;
  // 100::/64 破棄用
  if (g[0] === 0x0100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true;

  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 ユニークローカル
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 リンクローカル
  if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 サイトローカル（廃止済み）
  if ((g[0] & 0xff00) === 0xff00) return true; // ff00::/8 マルチキャスト
  return false;
}

/** IPv4 / IPv6 のどちらでも、内部・予約アドレスなら true。 */
export function isPrivateIp(ip: string): boolean {
  return ip.includes(":") ? isPrivateIPv6(ip) : isPrivateIPv4(ip);
}

// ────────────────────────────── URL の形の検査 ──────────────────────────────

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".localdomain",
  ".lan",
  ".home.arpa",
  ".intranet",
  ".corp",
];

/**
 * ホスト名が「公開された普通のドメイン名」の形をしているか。
 *
 * new URL() は 2130706433 や 0x7f.1 のような数値ホストを 127.0.0.1 に正規化するため、
 * 正規化後に「IP に見えるもの」を全部弾けば10進・16進・8進の各表記をまとめて拒否できる。
 * 正規化されずに残る形（最後のラベルが数字・0x…だけ）も念のため弾く。
 */
export function assertPublicHostnameSyntax(hostname: string): void {
  const host = hostname.toLowerCase();
  const bad = () => new SsrfError("Invalid URL: this host is not allowed");

  if (!host || host.length > 253) throw bad();
  if (host.startsWith("[") || host.includes(":")) throw bad(); // IPv6 直指定
  if (host.endsWith(".")) throw bad();
  if (!/^[a-z0-9.-]+$/.test(host)) throw bad();
  if (!host.includes(".")) throw bad(); // localhost・単一ラベルのホスト名
  if (host === "localhost") throw bad();
  if (BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) throw bad();
  if (/^\d+(\.\d+){3}$/.test(host)) throw bad(); // IPv4 直指定（正規化後の形）

  const labels = host.split(".");
  if (labels.some((l) => l === "" || l.length > 63)) throw bad();
  const last = labels[labels.length - 1];
  if (/^(\d+|0x[0-9a-f]*)$/i.test(last)) throw bad(); // 数値・16進の最後のラベル
}

/**
 * 外部から渡された URL 文字列を検査して URL にする。
 * https のみ・長さ上限・認証情報なし・ポート 443 のみ・ホスト名の形の検査まで。DNS は引かない。
 */
export function parsePublicHttpsUrl(raw: unknown): URL {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) {
    throw new SsrfError("Invalid URL");
  }
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new SsrfError("Invalid URL");
  }
  if (url.protocol !== "https:") throw new SsrfError("Invalid URL: only https is allowed");
  if (url.username || url.password) throw new SsrfError("Invalid URL: credentials are not allowed");
  if (url.port && url.port !== "443") throw new SsrfError("Invalid URL: port is not allowed");
  assertPublicHostnameSyntax(url.hostname);
  return url;
}

// ────────────────────────────── DNS の検査 ──────────────────────────────

export interface ResolveOptions {
  /**
   * Deno.resolveDns が使えない実行環境のとき、検査を飛ばして通すか。
   * 既定は false（安全側で拒否）。許可リストで接続先を絞っている呼び出し側だけが true にする。
   */
  allowDnsUnavailable?: boolean;
}

/** ホスト名を A / AAAA で引き、1件でも内部アドレスなら拒否する。 */
export async function assertHostResolvesPublic(
  hostname: string,
  options: ResolveOptions = {}
): Promise<void> {
  // deno-lint-ignore no-explicit-any
  const deno = (globalThis as any).Deno;
  if (!deno || typeof deno.resolveDns !== "function") {
    if (options.allowDnsUnavailable) return;
    throw new SsrfError("Unable to verify host", 502);
  }

  const addresses: string[] = [];
  for (const type of ["A", "AAAA"] as const) {
    try {
      const records: string[] = await deno.resolveDns(hostname, type);
      addresses.push(...records);
    } catch (e) {
      const name = (e as { name?: string })?.name ?? "";
      if (name === "NotFound") continue; // その種類のレコードが無いだけ
      if (name === "NotSupported" || name === "PermissionDenied" || e instanceof TypeError) {
        if (options.allowDnsUnavailable) return;
        throw new SsrfError("Unable to verify host", 502);
      }
      console.error("ssrf: dns lookup failed:", hostname, type, name);
      throw new SsrfError("Unable to resolve host", 502);
    }
  }

  if (addresses.length === 0) throw new SsrfError("Unable to resolve host", 502);
  for (const ip of addresses) {
    if (isPrivateIp(ip)) {
      console.warn("ssrf: blocked host resolving to a private address:", hostname);
      throw new SsrfError("Invalid URL: this host is not allowed");
    }
  }
}

/** 形の検査 + DNS の検査。fetch はしない（外部サービスに URL を渡すだけの用途向け）。 */
export async function assertPublicHttpsUrl(
  raw: unknown,
  options: ResolveOptions = {}
): Promise<URL> {
  const url = parsePublicHttpsUrl(raw);
  await assertHostResolvesPublic(url.hostname, options);
  return url;
}

// ────────────────────────────── 安全な fetch ──────────────────────────────

export interface SafeFetchOptions extends ResolveOptions {
  /** 辿るリダイレクトの上限。既定 3。 */
  maxRedirects?: number;
  /** 全体のタイムアウト（ミリ秒）。本文の読み込みも含む。既定 10000。 */
  timeoutMs?: number;
  /** URL ごとに付けるリクエストヘッダ。リダイレクト先ごとに呼ばれる。 */
  headers?: (url: URL) => HeadersInit;
  /** 各ホップの URL に追加で課す検査（許可リストなど）。拒否するときは SsrfError を投げる。 */
  validateUrl?: (url: URL) => void;
}

export interface SafeFetchResult {
  response: Response;
  /** リダイレクトを辿った後の最終 URL。相対 URL の解決に使う。 */
  finalUrl: URL;
}

/**
 * SSRF 対策つきの GET。リダイレクトは自分で辿り、ホップごとに全検査をやり直す。
 * 返すのは最終レスポンス。本文は呼び出し側が readBodyCapped などで上限つきで読むこと。
 */
export async function safeFetch(raw: string | URL, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const maxRedirects = options.maxRedirects ?? 3;
  const signal = AbortSignal.timeout(options.timeoutMs ?? 10_000);

  let current: string = raw instanceof URL ? raw.toString() : raw;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = parsePublicHttpsUrl(current);
    options.validateUrl?.(url);
    await assertHostResolvesPublic(url.hostname, options);

    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: options.headers?.(url),
    });

    const isRedirect = response.status >= 300 && response.status < 400;
    const location = response.headers.get("location");
    if (!isRedirect || !location) {
      return { response, finalUrl: url };
    }

    await response.body?.cancel().catch(() => {});
    if (hop === maxRedirects) throw new SsrfError("Too many redirects", 502);
    try {
      current = new URL(location, url).toString();
    } catch {
      throw new SsrfError("Invalid redirect", 502);
    }
  }
  throw new SsrfError("Too many redirects", 502);
}

// ────────────────────────────── 本文の読み込み ──────────────────────────────

export interface ReadBodyOptions {
  /** true なら上限に達した時点で打ち切って、そこまでを返す。false（既定）なら 413 で失敗させる。 */
  truncate?: boolean;
}

/** 本文を上限つきで読む。Content-Length が上限超えなら読み始めずに断る。 */
export async function readBodyCapped(
  response: Response,
  maxBytes: number,
  options: ReadBodyOptions = {}
): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length"));
  if (!options.truncate && Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel().catch(() => {});
    throw new SsrfError("Response too large", 413);
  }
  if (!response.body) return new Uint8Array(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      if (!options.truncate) throw new SsrfError("Response too large", 413);
      chunks.push(value.subarray(0, value.byteLength - (total - maxBytes)));
      total = maxBytes;
      break;
    }
    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/** Content-Type から ; 以降を落として小文字にしたもの。無ければ空文字。 */
export function mediaType(response: Response): string {
  return (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
}

// ────────────────────────────── ホストの許可リスト ──────────────────────────────

/**
 * ホスト名が許可リストにあるか。リストの要素は完全一致、または "*.example.com"（サブドメインのみ）。
 */
export function hostMatches(hostname: string, patterns: string[]): boolean {
  const host = hostname.toLowerCase();
  return patterns.some((raw) => {
    const p = raw.trim().toLowerCase();
    if (!p) return false;
    if (p.startsWith("*.")) return host.endsWith(p.slice(1)) && host.length > p.length - 1;
    return host === p;
  });
}
