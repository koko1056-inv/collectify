/**
 * 作品情報の補完で、AIの応答を解釈する部分の検証。
 *
 * ここが壊れると「判定できませんでした」が並ぶだけで例外は出ない。
 * モデルは JSON を ```json で包んだり、前後に文章を付けたり、
 * 作品名の綴りを揺らしたりしてくる。その全部を落とさず拾えるか見る。
 *
 *   npm run test:backfill
 */
import { build } from "esbuild";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function check(label, ok, detail = "") {
  if (ok) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

// Deno 向けの import を Node で読めるように差し替える。
const shim = {
  name: "deno-shim",
  setup(b) {
    b.onResolve({ filter: /^https:\/\// }, (args) => ({ path: args.path, namespace: "stub" }));
    b.onResolve({ filter: /_shared\/ai\.ts$/ }, (args) => ({ path: args.path, namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: "export const serve = () => {}; export const createClient = () => ({}); export const callAi = async () => ({});",
      loader: "js",
    }));
  },
};

const out = await build({
  entryPoints: [resolve(root, "supabase/functions/backfill-item-series/index.ts")],
  bundle: true, write: false, format: "esm", platform: "node", plugins: [shim],
});
globalThis.Deno = { env: { get: () => "stub" } };
const mod = await import(
  `data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`
);
const { parseResults, toCandidates } = mod;

console.log("\n── AI応答の解釈 ──");

const plain = '{"results":[{"index":0,"series":"ちいかわ","isNew":false,"confidence":0.95}]}';
check("素のJSONを読める", parseResults(plain).get(0)?.series === "ちいかわ");

const fenced = "```json\n" + plain + "\n```";
check("```json で包まれていても読める", parseResults(fenced).get(0)?.series === "ちいかわ");

const chatty = "はい、判定しました。\n" + plain + "\n以上です。";
check("前後に文章が付いていても読める", parseResults(chatty).get(0)?.series === "ちいかわ");

// 壊れた入力はわざと渡している。関数側は console.error で記録する作りなので、
// ここだけ黙らせないとバンドルのdata URLごとスタックが流れて結果が読めない。
const quiet = (fn) => {
  const original = console.error;
  console.error = () => {};
  try { return fn(); } finally { console.error = original; }
};
check("壊れたJSONでも例外を投げない", quiet(() => parseResults("{{{ nope").size) === 0);
check("空文字でも例外を投げない", quiet(() => parseResults("").size) === 0);

const nullSeries = '{"results":[{"index":0,"series":null,"confidence":0}]}';
check("series が null の行も拾う", parseResults(nullSeries).has(0));

const badIndex = '{"results":[{"index":"x","series":"A"},{"index":1,"series":"B"}]}';
const bi = parseResults(badIndex);
check("index が数値でない行は捨てる", bi.size === 1 && bi.get(1)?.series === "B");

console.log("\n── 綴りの寄せ ──");

const targets = [
  { id: "a", kind: "user_item", title: "MGA Rocket Bracelet" },
  { id: "b", kind: "user_item", title: "ちいかわ マスコット" },
  { id: "c", kind: "official_item", title: "謎のグッズ" },
  { id: "d", kind: "user_item", title: "新作グッズ" },
];
const known = ["ミセスグリーンアップル", "ちいかわ"];
const parsed = new Map([
  // 既存の綴りと大文字小文字・空白だけ違うケース
  [0, { series: " ミセスグリーンアップル ", confidence: 0.9 }],
  [1, { series: "ちいかわ", confidence: 0.98 }],
  [2, { series: null, confidence: 0 }],
  [3, { series: "ぜんぜん新しい作品", confidence: 0.8 }],
]);
const cands = toCandidates(targets, parsed, known);

check("前後の空白は既存の綴りに寄る", cands[0].suggestion === "ミセスグリーンアップル", cands[0].suggestion);
check("既存名は新規扱いにしない", cands[0].isNew === false);
check("完全一致も既存扱い", cands[1].suggestion === "ちいかわ" && cands[1].isNew === false);
check("判定できないものは null のまま", cands[2].suggestion === null && cands[2].isNew === false);
check("リストに無い名前は新規扱い", cands[3].suggestion === "ぜんぜん新しい作品" && cands[3].isNew === true);
check("確信度が引き継がれる", cands[3].confidence === 0.8, String(cands[3].confidence));
check("確信度が欠けていたら0", toCandidates([targets[0]], new Map([[0, { series: "X" }]]), []).at(0).confidence === 0);
check("種別が保たれる", cands[2].kind === "official_item");
check("件数は対象と同じ", cands.length === targets.length);

// 応答が足りない・多い場合でも対象の件数で返る
const short = toCandidates(targets, new Map([[0, { series: "ちいかわ", confidence: 1 }]]), known);
check("応答が足りなくても対象の件数で返る", short.length === 4 && short[3].suggestion === null);

console.log(`\n${failures === 0 ? "すべて通過" : `${failures} 件失敗`}\n`);
process.exit(failures === 0 ? 0 : 1);
