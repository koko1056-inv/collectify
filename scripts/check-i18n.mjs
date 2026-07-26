/**
 * すべての t("...") が翻訳辞書に存在するか検証する。
 * 未定義のキーは画面に生のキー文字列として表示されてしまうため、CI 相当のガードとして使う。
 *   使い方: node scripts/check-i18n.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = "src";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|ts)$/.test(name)) out.push(p);
  }
  return out;
}

// t("...") の呼び出しからキーを収集（テンプレートリテラルや変数は対象外）
const files = walk(SRC);
const used = new Map(); // key -> [files]
for (const f of files) {
  if (f.includes("translations/")) continue;
  const s = readFileSync(f, "utf8");
  for (const m of s.matchAll(/\bt\(\s*"([^"]+)"/g)) {
    if (!used.has(m[1])) used.set(m[1], []);
    used.get(m[1]).push(f);
  }
}

// 辞書を素朴にパースする代わりに、キーの葉をテキストから収集する
function collectKeys(objSrc) {
  return objSrc;
}

// 実際の辞書は TS なので、ここでは import せず簡易評価する
const dictFiles = [
  "src/translations/ja.ts",
  ...readdirSync("src/translations/modules")
    .filter((n) => n.endsWith(".ts") && n !== "index.ts")
    .map((n) => `src/translations/modules/${n}`),
];

// "a.b.c" 形式の完全キー集合を作る
const defined = new Set();
for (const df of dictFiles) {
  const src = readFileSync(df, "utf8");
  const isModule = df.includes("/modules/");
  const ns = isModule ? df.split("/").pop().replace(".ts", "") : null;
  // ja ブロックのみ対象
  let body = src;
  if (isModule) {
    const m = src.match(/^  ja:\s*\{/m);
    if (!m) continue;
    const start = m.index + m[0].length;
    const en = src.match(/^  en:\s*\{/m);
    body = src.slice(start, en ? en.index : undefined);
  }
  // 波括弧の深さを追いながらキーのパスを組み立てる
  const stack = ns ? [ns] : [];
  const lines = body.split("\n");
  for (const line of lines) {
    const kv = line.match(/^\s*([A-Za-z_][\w]*)\s*:\s*"/);
    const open = line.match(/^\s*([A-Za-z_][\w]*)\s*:\s*\{/);
    if (kv) defined.add([...stack, kv[1]].join("."));
    else if (open) stack.push(open[1]);
    else if (/^\s*\},?\s*$/.test(line)) stack.pop();
  }
}

const missing = [...used.entries()].filter(([k]) => !defined.has(k));
console.log(`使用キー: ${used.size} / 定義キー: ${defined.size}`);
if (missing.length === 0) {
  console.log("✓ 未定義キーなし");
  process.exit(0);
}
console.log(`✗ 未定義キー ${missing.length} 件:`);
for (const [k, fs] of missing.slice(0, 40)) {
  console.log(`  ${k}   (${fs[0]})`);
}
if (missing.length > 40) console.log(`  ...他 ${missing.length - 40} 件`);
process.exit(1);
