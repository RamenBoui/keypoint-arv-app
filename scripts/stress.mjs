// Stress + abuse battery for the live ARV flow (node scripts/stress.mjs).
// Hits exactly what the deployed app hits, asserts the invariants the UI
// depends on, and measures latency under concurrency.
//
//   site          20 concurrent GETs on the Pages host
//   arv-agent     rounds of concurrent valuations; band ordering, 6 tiers,
//                 breakeven fields — the free pure function, safe to hammer
//   fuzz          malformed bodies must 4xx with a helpful message, never 5xx
//   aipro-enrich  3 repeats (cache check) + 1 garbage address — paid, gentle
//   permit-history covered + uncovered city — LIVE government feeds, 3 calls max
const SITE = "https://ramenboui.github.io/keypoint-arv-app/";
const FN = "https://bbkeogzyqwszmijmvlmj.supabase.co/functions/v1";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJia2VvZ3p5cXdzem1pam12bG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MDgzMjYsImV4cCI6MjA5ODE4NDMyNn0.hfaZ4zhZbUAKvN9KKmSRCrts1H-atv1Yg1CTEpcSeh4";

const failures = [];
const ok = (cond, label) => { if (!cond) failures.push(label); return cond; };
const pct = (arr, p) => arr.slice().sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor(arr.length * p))];

async function call(fn, body) {
  const t0 = performance.now();
  const res = await fetch(`${FN}/${fn}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const ms = performance.now() - t0;
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, ms, json };
}

// ---- 1. the site itself ------------------------------------------------
{
  const runs = await Promise.all(Array.from({ length: 20 }, async () => {
    const t0 = performance.now();
    const r = await fetch(SITE, { cache: "no-store" });
    const text = await r.text();
    return { s: r.status, ms: performance.now() - t0, hasRoot: text.includes('id="root"'), rel: text.includes('src="./_expo/') };
  }));
  ok(runs.every((r) => r.s === 200 && r.hasRoot && r.rel), "site: 20/20 200s with patched bundle ref");
  console.log(`site      20 concurrent · all ${runs.every((r) => r.s === 200) ? "200" : "MIXED"} · p50 ${pct(runs.map(r=>r.ms),.5)|0}ms p95 ${pct(runs.map(r=>r.ms),.95)|0}ms`);
}

// ---- 2. arv-agent under concurrency ------------------------------------
{
  const COMPS = [
    { sale_price: 2200000, square_feet: 5148, closed: true, renovated: true, id: "A" },
    { sale_price: 1750000, square_feet: 5486, closed: true, id: "B" },
    { sale_price: 2599000, square_feet: 4834, closed: true, id: "C" },
  ];
  const body = (i) => ({
    subject: { square_feet: 4800 + (i % 7) * 100 },
    comps: COMPS,
    deal: { purchase_price: 1600000, build_cost: 250000, term_months: 6 },
    posture: "public_record",
  });
  const all = [];
  for (let round = 0; round < 4; round++) {
    const runs = await Promise.all(Array.from({ length: 25 }, (_, i) => call("arv-agent", body(round * 25 + i))));
    all.push(...runs);
  }
  const lat = all.map((r) => r.ms);
  const good = all.filter((r) =>
    r.status === 200 &&
    r.json?.band?.arv?.p20 <= r.json?.band?.arv?.p50 &&
    r.json?.band?.arv?.p50 <= r.json?.band?.arv?.p80 &&
    r.json?.tiers?.length === 6 &&
    typeof r.json?.breakeven?.breakeven_psf === "number" &&
    typeof r.json?.breakeven?.verdict === "string" &&
    r.json?.comp_set?.used === 3,
  );
  ok(good.length === all.length, `arv-agent: ${good.length}/${all.length} passed invariants`);
  console.log(`arv-agent ${all.length} calls · ${good.length} invariant-clean · p50 ${pct(lat,.5)|0}ms p95 ${pct(lat,.95)|0}ms max ${Math.max(...lat)|0}ms`);
}

// ---- 3. fuzz — bad input must 4xx helpfully, never 5xx ------------------
{
  const cases = [
    ["no body", {}],
    ["subject not object", { subject: 12 }],
    ["sqft zero", { subject: { square_feet: 0 }, comp_psf: 500 }],
    ["sqft negative", { subject: { square_feet: -50 }, comp_psf: 500 }],
    ["sqft absurd", { subject: { square_feet: 1e12 }, comp_psf: 500 }],
    ["no comp evidence", { subject: { square_feet: 1800 } }],
    ["comp price 0", { subject: { square_feet: 1800 }, comps: [{ sale_price: 0, square_feet: 1500 }] }],
    ["comp string fields", { subject: { square_feet: 1800 }, comps: [{ sale_price: "a", square_feet: "b" }] }],
    ["inferiority out of range", { subject: { square_feet: 1800 }, comp_psf: 500, permanent_inferiority_pct: 0.9 }],
    ["deal negative term", { subject: { square_feet: 1800 }, comp_psf: 500, deal: { purchase_price: 1, build_cost: 0, term_months: -6 } }],
    ["injection strings", { subject: { square_feet: 1800 }, comps: [{ sale_price: 1, square_feet: 1, id: "<script>alert(1)</script>'; drop table x;--" }], comp_psf: 500 }],
    ["500 comps", { subject: { square_feet: 1800 }, comps: Array.from({ length: 500 }, (_, i) => ({ sale_price: 900000 + i, square_feet: 1700 + (i % 50), closed: i % 2 === 0 })) }],
  ];
  let clean = 0;
  for (const [label, body] of cases) {
    const r = await call("arv-agent", body);
    // 403-with-no-JSON = the platform WAF eating hostile patterns (verified:
    // "drop table" trips it, script tags reach the function's own 400) —
    // protective, counts as handled.
    const acceptable = r.status < 500 && (r.status === 200 || r.status === 403 || typeof r.json?.error === "string");
    if (!ok(acceptable, `fuzz "${label}": got ${r.status} ${JSON.stringify(r.json)?.slice(0, 80)}`)) continue;
    clean++;
  }
  console.log(`fuzz      ${clean}/${cases.length} handled (no 5xx, errors carry messages)`);
}

// ---- 4. aipro-enrich — cache + graceful garbage (paid: 4 calls) ---------
{
  const addr = { line: "348 N Genesee Ave", city: "Los Angeles", state: "CA", zip: "" };
  const times = [];
  for (let i = 0; i < 3; i++) { const r = await call("aipro-enrich", { address: addr }); times.push(r.ms); ok(r.status === 200 && r.json?.fields, `enrich #${i}: ${r.status}`); }
  const garbage = await call("aipro-enrich", { address: { line: "999999 Nowhere Blvd", city: "Atlantis", state: "ZZ", zip: "" } });
  ok(garbage.status < 500, `enrich garbage address: ${garbage.status}`);
  console.log(`enrich    3× same address ${times.map((t) => `${t | 0}ms`).join(" ")} (cache) · garbage → ${garbage.status}`);
}

// ---- 5. permit-history — live gov feeds, 3 polite calls -----------------
{
  const covered = await call("permit-history", { address: "348 N Genesee Ave", city: "Los Angeles" });
  ok(covered.status === 200 && covered.json?.live === true && Array.isArray(covered.json?.permits), `permits covered: ${covered.status}`);
  const uncovered = await call("permit-history", { address: "1 Main St", city: "West Covina" });
  ok(uncovered.status === 200 && uncovered.json?.covered === false && Array.isArray(uncovered.json?.supported), `permits uncovered: ${uncovered.status}`);
  const bad = await call("permit-history", { address: "", city: "" });
  ok(bad.status >= 400 && bad.status < 500 && typeof bad.json?.error === "string", `permits bad input: ${bad.status}`);
  console.log(`permits   covered ${covered.ms | 0}ms (${covered.json?.permits?.length} rows) · uncovered honest · bad input ${bad.status}`);
}

// ---- verdict ------------------------------------------------------------
if (failures.length) {
  console.error(`\nFAILURES (${failures.length}):`);
  for (const f of failures) console.error(" ✗", f);
  process.exit(1);
}
console.log("\nALL CLEAR — site + engines held under the battery.");
