/**
 * オンボーディングの配線チェック。
 *
 * スポットライトガイドは全部が文字列で繋がっている:
 *   tours.ts の target  →  src の data-tour 属性
 *   tours.ts の *Key    →  translations/modules/tour.ts のキー
 *   tours.ts の path    →  App.tsx のルート
 * どれか1つ消えても型エラーにならず、本番で「暗転したまま何も指さない」
 * あるいは「tour.collection.nav.title という生キーが出る」形で壊れる。
 * ここで落として気付けるようにする。
 *
 *   npm run test:tours
 */
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function check(label, ok, detail = "") {
  if (ok) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** TSのモジュールをNodeで読めるようにバンドルして評価する。 */
async function load(entry) {
  const out = await build({
    entryPoints: [resolve(root, entry)],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    // tours.ts は型だけのimportしか持たないので外部依存は無い。
    external: ["react", "react-dom"],
    // steps.ts はアイコン（lucide-react）を持つ。ここでは中身を見ないので、何でも返す空の部品に置き換える
    // （本物を束ねると React が要り、Node では読み込めない）。
    plugins: [
      {
        name: "stub-lucide",
        setup(b) {
          b.onResolve({ filter: /^lucide-react$/ }, () => ({ path: "lucide-react", namespace: "stub" }));
          b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
            contents: "module.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : {}) });",
            loader: "js",
          }));
        },
      },
    ],
  });
  const code = out.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

/** 入れ子辞書から "a.b.c" を引く。 */
function lookup(dict, key) {
  let node = dict;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

const { PAGE_TOURS, tourForLocation } = await load("src/components/onboarding/tours.ts");
const { tour } = await load("src/translations/modules/tour.ts");

console.log(`\nチェック対象: ${PAGE_TOURS.length} ツアー\n`);

// ── 1. ID が重複していないか（重複すると片方が永久に出ない） ──
const ids = PAGE_TOURS.map((t) => t.id);
check("ツアーIDが一意", new Set(ids).size === ids.length, ids.join(", "));

// ── 2. 各ツアーが1歩以上持っているか ──
for (const t of PAGE_TOURS) {
  check(`${t.id}: 1歩以上ある`, t.steps.length > 0);
}

// ── 3. target に対応する data-tour が src にあるか ──
const { execFileSync } = await import("node:child_process");
const grepped = execFileSync(
  "grep",
  ["-rho", '--include=*.tsx', '--include=*.ts', 'data-tour="[^"$]*"', "src"],
  { cwd: root, encoding: "utf8" }
);
const anchors = new Set([...grepped.matchAll(/data-tour="([^"]+)"/g)].map((m) => m[1]));

const targets = new Set(
  PAGE_TOURS.flatMap((t) => t.steps.map((s) => s.target)).filter(Boolean)
);
for (const target of [...targets].sort()) {
  check(`data-tour="${target}" が存在する`, anchors.has(target));
}
// 使われていないアンカーは消し忘れ。落とすほどではないので警告に留める。
for (const anchor of [...anchors].sort()) {
  if (!targets.has(anchor)) {
    console.log(`  warn data-tour="${anchor}" はどのツアーからも参照されていない`);
  }
}

// ── 4. 文言キーが ja / en 両方で引けるか ──
const copyKeys = new Set(
  PAGE_TOURS.flatMap((t) => t.steps.flatMap((s) => [s.titleKey, s.bodyKey, s.wideBodyKey].filter(Boolean)))
);
// エンジン自身が使う固定文言も一緒に見る。
for (const k of [
  "tour.a11yLabel",
  "tour.next",
  "tour.done",
  "tour.skip",
  "tour.tapIt",
  "tour.progress",
  "tour.disableAll",
  "tour.replayAll",
  "tour.replayDone",
]) {
  copyKeys.add(k);
}

for (const key of [...copyKeys].sort()) {
  // tour.ts は "tour" 名前空間の中身そのものなので先頭を落とす。
  const inner = key.replace(/^tour\./, "");
  check(`ja: ${key}`, lookup(tour.ja, inner) !== undefined);
  check(`en: ${key}`, lookup(tour.en, inner) !== undefined);
}

// ── 5. path が App.tsx の実在ルートか ──
const app = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const routes = new Set([...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]));
for (const t of PAGE_TOURS) {
  check(`${t.id}: ${t.path} はルートとして存在する`, routes.has(t.path));
}

// ── 6. 「押させて終わる」設計が守られているか ──
// 体験させる以上、最後が説明文で終わるツアーは意図を外している。
// ただし1歩だけの補足ツアーは説明で終わって良い。
for (const t of PAGE_TOURS) {
  if (t.steps.length < 3) continue;
  const last = t.steps[t.steps.length - 1];
  check(
    `${t.id}: 3歩以上なら最後は実操作で終える`,
    last.advance === "click",
    `last step advance=${last.advance ?? "next"}`
  );
}

// ── 7. 同じ画面に複数のツアーが居る場合、取り違えないか ──
// /search はタブで中身が入れ替わる。既定タブのツアーが交換タブで走ると、
// 指す対象がタブごと未描画で全ステップ飛んで「見た」記録だけが残る。
const lookupCases = [
  ["/collection", "", "collection-v1"],
  ["/quick-add", "", "quick-add-v1"],
  ["/search", "", "search-v1"],
  ["/search", "?tab=goods", "search-v1"],
  ["/search", "?tab=", "search-v1"],
  // 交換は /trade に移った。/search?tab=trade は /trade へ転送するだけなのでツアーは出さない
  ["/search", "?tab=trade", undefined],
  ["/trade", "", "trade-v1"],
  ["/search", "?tab=friends", undefined],
  ["/explore", "?tab=rooms", "explore-v2"],
  ["/explore", "?tab=posts", "explore-v2"],
  ["/explore", "", "explore-v2"],
  ["/me", "", "me-v1"],
  // 設定シートを開いているときはマイページのツアーを重ねない
  ["/me", "?settings=1", undefined],
  ["/oshi", "", "oshi-room-v1"],
  ["/login", "", undefined],
];
for (const [path, search, want] of lookupCases) {
  const got = tourForLocation(path, search)?.id;
  check(
    `${path}${search} → ${want ?? "ツアー無し"}`,
    got === want,
    `got ${got ?? "undefined"}`
  );
}

// ── 8. 同じ (path, query) を2本のツアーが取り合っていないか ──
const seenKeys = new Map();
for (const t of PAGE_TOURS) {
  const key = `${t.path}|${JSON.stringify(t.query ?? null)}`;
  check(`${t.id}: 発火条件が他と重複しない`, !seenKeys.has(key), `${seenKeys.get(key)} と同条件`);
  seenKeys.set(key, t.id);
}

// ── 9. query は URLSearchParams で引けるキーだけか（打ち間違い検出） ──
const KNOWN_QUERY_KEYS = new Set(["tab", "settings"]);
for (const t of PAGE_TOURS) {
  for (const key of Object.keys(t.query ?? {})) {
    check(`${t.id}: query キー "${key}" は既知`, KNOWN_QUERY_KEYS.has(key));
  }
}

// ── 10. はじめてガイド（チェックリスト）の項目と、押したときの案内 ──
// 項目は「登録する → 眺める → コンプ → 交換」の流れに沿って5つ前後に絞っている。
// 増やしすぎると以前の10項目に戻ってしまうので、上限を見張る。
// 各項目は行き先（GUIDE_TASKS）を持ち、その行き先・指す場所・文言がそろっていること。
const { ONBOARDING_STEPS, LEGACY_ONBOARDING_STEPS, findOnboardingStep } = await load("src/components/onboarding/steps.ts");
const { GUIDE_TASKS, guideHref, guideForLocation } = await load("src/components/onboarding/guideTasks.ts");
const { misc } = await load("src/translations/modules/misc.ts");

console.log(`\nはじめてガイド: ${ONBOARDING_STEPS.length} 項目\n`);
check("ガイドは4〜6項目", ONBOARDING_STEPS.length >= 4 && ONBOARDING_STEPS.length <= 6, `${ONBOARDING_STEPS.length} 項目`);
const stepIds = ONBOARDING_STEPS.map((s) => s.id);
check("ガイドの項目IDが一意", new Set(stepIds).size === stepIds.length, stepIds.join(", "));
// 外した項目もサーバーの受け取り記録（onboarding_rewards）に残るので、通知で名前が引けること
for (const id of ["account", "profile", "first-item", "favorites", "wishlist", "ai-room", "avatar", "follow", "trade-offer", "bookmark"]) {
  check(`以前の項目 ${id} の名前が引ける`, !!findOnboardingStep(id));
}
check("今の項目と以前の項目が重ならない", !LEGACY_ONBOARDING_STEPS.some((l) => stepIds.includes(l.id)));
for (const step of [...ONBOARDING_STEPS, ...LEGACY_ONBOARDING_STEPS]) {
  for (const key of [step.labelKey, step.descriptionKey]) {
    const inner = key.replace(/^misc\./, "");
    check(`ja: ${key}`, lookup(misc.ja, inner) !== undefined);
    check(`en: ${key}`, lookup(misc.en, inner) !== undefined);
  }
}
for (const id of stepIds) {
  const task = GUIDE_TASKS[id];
  check(`${id}: 行き先がある`, !!task);
  if (!task) continue;
  const path = task.path.split("?")[0];
  check(`${id}: ${path} はルートとして存在する`, routes.has(path));
  for (const s of task.steps) {
    check(`${id}: data-tour="${s.target}" が存在する`, anchors.has(s.target));
    for (const key of [s.titleKey, s.bodyKey]) {
      const inner = key.replace(/^tour\./, "");
      check(`${id}: ja ${key}`, lookup(tour.ja, inner) !== undefined);
      check(`${id}: en ${key}`, lookup(tour.en, inner) !== undefined);
    }
  }
  // 押した先で、その案内が実際に出る（?guide= 付きの URL で guideForLocation が当たる）
  const href = guideHref(id);
  const u = new URL(href, "https://x.test");
  check(`${id}: ${href} で案内が出る`, guideForLocation(u.pathname, u.search)?.id === id);
}
// 外した項目の ?guide= は何も出さない（古いリンクから来ても暗転しない）
check("以前の項目 ai-room の ?guide= では案内を出さない", guideForLocation("/ai-rooms", "?guide=ai-room") === null);

console.log(`\n${failures === 0 ? "すべて通過" : `${failures} 件失敗`}\n`);
process.exit(failures === 0 ? 0 : 1);
