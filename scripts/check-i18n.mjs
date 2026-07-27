/**
 * すべての t("...") が翻訳辞書に存在するか検証する。
 * 未定義キーは画面に生のキー文字列として表示されてしまうため、リリース前のガードとして使う。
 *
 *   node scripts/check-i18n.mjs
 *
 * 辞書は正規表現で読まず、esbuild で実際にバンドルして評価する。
 * ネストの深い翻訳ファイルを自前パースすると誤検知が出て、かえって信用できなくなるため。
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const SRC = "src";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

// --- 1. コード中の t("...") を集める（テンプレートリテラルや変数は対象外） ---
const used = new Map(); // key -> file[]
for (const f of walk(SRC)) {
  if (f.includes(`${SRC}/translations/`)) continue;
  const s = readFileSync(f, "utf8");
  for (const m of s.matchAll(/\bt\(\s*"([^"]+)"/g)) {
    if (!used.has(m[1])) used.set(m[1], []);
    used.get(m[1]).push(f);
  }
}

// --- 2. 辞書を実際にビルドして読み込む ---
const tmp = mkdtempSync(join(tmpdir(), "i18n-check-"));
const entry = join(tmp, "entry.ts");
const outFile = join(tmp, "dict.mjs");
const dictPath = join(process.cwd(), SRC, "translations", "index.ts");
writeFileSync(entry, `export { translations } from ${JSON.stringify(dictPath)};\n`);

try {
  execFileSync(
    "bunx",
    [
      "esbuild",
      entry,
      "--bundle",
      "--format=esm",
      "--platform=node",
      `--outfile=${outFile}`,
      "--define:import.meta.env.DEV=false",
      "--log-level=error",
    ],
    { stdio: ["ignore", "ignore", "inherit"] }
  );
} catch {
  console.error("辞書のビルドに失敗しました");
  rmSync(tmp, { recursive: true, force: true });
  process.exit(2);
}

const { translations } = await import(pathToFileURL(outFile).href);
rmSync(tmp, { recursive: true, force: true });

function flatten(obj, prefix = "", out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, path, out);
    else out.add(path);
  }
  return out;
}

const jaKeys = flatten(translations.ja);
const enKeys = flatten(translations.en);

// --- 3. 検証 ---
const missing = [...used.entries()].filter(([k]) => !jaKeys.has(k));
const missingEn = [...used.keys()].filter((k) => jaKeys.has(k) && !enKeys.has(k));

console.log(`使用キー ${used.size} / ja 定義 ${jaKeys.size} / en 定義 ${enKeys.size}`);

if (missingEn.length) {
  console.log(`\n△ 英訳が無いキー ${missingEn.length} 件（日本語にフォールバックします）:`);
  for (const k of missingEn.slice(0, 15)) console.log(`  ${k}`);
  if (missingEn.length > 15) console.log(`  ...他 ${missingEn.length - 15} 件`);
}

if (missing.length === 0) {
  console.log("\n✓ 未定義キーなし");
  process.exit(0);
}

console.log(`\n✗ 未定義キー ${missing.length} 件（画面に生のキーが出ます）:`);
for (const [k, fs] of missing.slice(0, 40)) console.log(`  ${k}   (${fs[0]})`);
if (missing.length > 40) console.log(`  ...他 ${missing.length - 40} 件`);
process.exit(1);
