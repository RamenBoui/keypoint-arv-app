// The app's pure spine: address parsing (the one input everything hangs on),
// share-link encode/decode (testimony must survive the URL), the report
// builder (the deliverable carries the flags and the screams), the local
// store (recents are the pick-up-where-I-left-off contract), and i18n
// coverage (es must never silently fall back mid-sentence).
const { parseAddress, fmtMoney, fmtMoneyFull, fmtPsf, fmtInt, numOrNull } = require("../src/util");
const { buildReportHtml } = require("../src/report");
const { STRINGS, makeT } = require("../src/i18n");

// share.js touches location/atob via Platform web guards — exercised through
// its pure strip/expand round-trip using the same fragment format.
const shareMod = require("../src/share");

describe("parseAddress — forgiving by design", () => {
  test.each([
    ["348 N Genesee Ave, Los Angeles, CA 90036", { line: "348 N Genesee Ave", city: "Los Angeles", state: "CA", zip: "90036" }],
    ["348 N Genesee Ave, Los Angeles CA 90036", { line: "348 N Genesee Ave", city: "Los Angeles", state: "CA", zip: "90036" }],
    ["348  N Genesee Ave ,  Los Angeles", { line: "348 N Genesee Ave", city: "Los Angeles", state: "CA", zip: "" }],
    ["1 Main St, La Verne, CA", { line: "1 Main St", city: "La Verne", state: "CA", zip: "" }],
    ["2825 Majestic St, West Covina 91791", { line: "2825 Majestic St", city: "West Covina", state: "CA", zip: "91791" }],
  ])("%s", (input, expected) => {
    expect(parseAddress(input)).toEqual(expected);
  });

  test("no comma → null (the error message guides the format)", () => {
    expect(parseAddress("348 N Genesee Ave Los Angeles")).toBeNull();
    expect(parseAddress("")).toBeNull();
  });
});

describe("display formatting", () => {
  test("money compresses at millions, never invents precision", () => {
    expect(fmtMoney(2150000)).toBe("$2.15M");
    expect(fmtMoney(950000)).toBe("$950,000");
    expect(fmtMoney(null)).toBe("—");
    expect(fmtMoneyFull(1600000)).toBe("$1,600,000");
    expect(fmtPsf(429.6)).toBe("$430/SF");
    expect(fmtInt(5156.4)).toBe("5,156");
  });
  test("numOrNull strips currency noise and rejects junk", () => {
    expect(numOrNull("$1,600,000")).toBe(1600000);
    expect(numOrNull("abc")).toBeNull();
    expect(numOrNull("0")).toBeNull(); // zero is never a valid price/sqft here
  });
});

describe("share link — testimony survives the URL", () => {
  const RUN = {
    addressText: "999 Test Blvd, Los Angeles, CA",
    address: { line: "999 Test Blvd", city: "Los Angeles", state: "CA", zip: "" },
    subject: { square_feet: 2000, total_sf_after: 2400, asIsAvm: 1500000, marketRent: 4200 },
    comps: [
      { id: "A", address: "111 Proof St", sale_price: 1200000, square_feet: 1900, closed: true, renovated: true, date: "2026-05", source: "enrich" },
      { id: "B", address: "222 Proof St", sale_price: 1300000, square_feet: 2100, closed: true, renovated: false, date: null, source: null },
    ],
    deal: { purchase_price: 1000000, build_cost: 200000, term_months: 6 },
  };

  test("shareUrl → takeSharedRun round-trips flags, sizes, and the deal", () => {
    // Simulate the web environment the module guards on.
    global.location = { origin: "https://x.test", pathname: "/app/", search: "", hash: "" };
    global.history = { replaceState: () => {} };
    const url = shareMod.shareUrl(RUN);
    expect(url).toMatch(/^https:\/\/x\.test\/app\/#run=[\w-]+$/);

    global.location.hash = "#" + url.split("#")[1];
    const restored = shareMod.takeSharedRun();
    expect(restored.addressText).toBe(RUN.addressText);
    expect(restored.subject).toEqual(RUN.subject);
    expect(restored.deal).toEqual(RUN.deal);
    expect(restored.comps.map((c) => [c.id, c.closed, c.renovated])).toEqual([
      ["A", true, true],
      ["B", true, false],
    ]);
    expect(restored.enriched).toBe(true); // comp A came from enrich
  });

  test("garbage hash → null, never a crash", () => {
    global.location = { origin: "https://x.test", pathname: "/", search: "", hash: "#run=%%%not-base64%%%" };
    expect(shareMod.takeSharedRun()).toBeNull();
    global.location.hash = "#run=aGVsbG8"; // valid b64 of "hello", invalid run
    expect(shareMod.takeSharedRun()).toBeNull();
  });

  test("§03 ceiling rides the link only when set — old links unchanged", () => {
    global.location = { origin: "https://x.test", pathname: "/app/", search: "", hash: "" };
    global.history = { replaceState: () => {} };

    // Without a ceiling the fragment carries NO pi key at all — a run shared
    // yesterday and one shared today encode byte-identically.
    const plainUrl = shareMod.shareUrl(RUN);
    const dec = (u) => JSON.parse(decodeURIComponent(escape(atob(u.split("#run=")[1].replace(/-/g, "+").replace(/_/g, "/")))));
    expect("pi" in dec(plainUrl)).toBe(false);
    global.location.hash = "#" + plainUrl.split("#")[1];
    expect(shareMod.takeSharedRun().ceiling_pct).toBeNull(); // old-link shape → null, never undefined

    // With a ceiling it round-trips as the fraction the engine takes.
    const capped = { ...RUN, ceiling_pct: 0.15 };
    global.location.hash = "#" + shareMod.shareUrl(capped).split("#")[1];
    expect(shareMod.takeSharedRun().ceiling_pct).toBe(0.15);
  });
});

describe("arv-agent body — §03 ceiling is strictly additive", () => {
  const { arvAgent } = require("../src/api");
  const COMPS = [{ id: "A", sale_price: 1, square_feet: 1, closed: true, renovated: false, source: null }];
  let sent;
  beforeEach(() => {
    sent = null;
    global.fetch = jest.fn(async (url, opts) => {
      sent = JSON.parse(opts.body);
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    });
  });

  test("unset → the body has no permanent_inferiority_pct key", async () => {
    await arvAgent({ subject: { square_feet: 1000 }, comps: COMPS });
    expect("permanent_inferiority_pct" in sent).toBe(false);
    await arvAgent({ subject: { square_feet: 1000 }, comps: COMPS, ceiling_pct: null });
    expect("permanent_inferiority_pct" in sent).toBe(false);
    await arvAgent({ subject: { square_feet: 1000 }, comps: COMPS, ceiling_pct: 0 });
    expect("permanent_inferiority_pct" in sent).toBe(false);
  });

  test("set → rides top-level as the contract-pinned fraction", async () => {
    await arvAgent({ subject: { square_feet: 1000 }, comps: COMPS, ceiling_pct: 0.15 });
    expect(sent.permanent_inferiority_pct).toBe(0.15);
  });
});

describe("report HTML — the deliverable is the defense", () => {
  const RESULT = {
    band: { total_sf: 5000, exit_psf: { p20: 367, p50: 425, p80: 434 }, arv: { p20: 1840000, p50: 2120000, p80: 2170000 } },
    breakeven: { breakeven_psf: 420, redline_psf: 468, cushion_pct_vs: 0.024, verdict: "P50 exit clears breakeven — cushion visible" },
    tiers: [{ tier: "S1", label: "Cosmetic", total_sf: 5000, arv_factor: 0.9, exit_psf: 382, arv_p50: 1910000 }],
    comp_set: { used: 7, confidence: "medium", evidence: "sold_asis", note: "$/SF median of 7 SOLD comps" },
    posture: "public_record",
    footer: "footer-line",
  };
  const RUN = {
    addressText: "348 N Genesee Ave, Los Angeles, CA 90036",
    subject: { square_feet: 5000, total_sf_after: null, asIsAvm: 2170000, marketRent: 2680 },
    comps: [
      { id: "A", address: "337 N Spaulding", sale_price: 2200000, square_feet: 5148, closed: true, renovated: true },
      { id: "B", address: "358 N Ogden", sale_price: 1750000, square_feet: 5486, closed: false, renovated: false },
    ],
    deal: { purchase_price: 1600000, build_cost: 250000, term_months: 6 },
  };

  test("carries the flags, the verdict verbatim, and the gap", () => {
    const html = buildReportHtml(RUN, RESULT);
    expect(html).toContain("✓ sold");
    expect(html).toContain("✓ renovated");
    expect(html).toContain("P50 exit clears breakeven — cushion visible"); // engine words, untouched
    expect(html).toContain("$/SF median of 7 SOLD comps"); // basis note verbatim
    expect(html).toContain("the gap:"); // X-05 anchor made it into the PDF
    expect(html).toContain("$2,680"); // market rent
    expect((html.match(/<script/gi) ?? []).length).toBe(0); // nothing executable
  });

  test("escapes hostile comp ids", () => {
    const hostile = { ...RUN, comps: [{ id: "<script>alert(1)</script>", sale_price: 1, square_feet: 1, closed: false, renovated: false }] };
    const html = buildReportHtml(hostile, RESULT);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  test("screams NONE SOLD when the evidence is unflagged", () => {
    const weak = { ...RESULT, comp_set: { ...RESULT.comp_set, evidence: "listings_or_unflagged" } };
    expect(buildReportHtml(RUN, weak)).toContain("NONE SOLD");
  });

  test("prints in Spanish when asked", () => {
    const html = buildReportHtml(RUN, RESULT, "es");
    expect(html).toContain("Ventas comparables — la evidencia");
    expect(html).toContain("✓ vendido");
    expect(html).toContain("P50 exit clears breakeven — cushion visible"); // engine text stays verbatim
  });

  test("§03 ceiling prints only when it was set AND the engine applied it", () => {
    expect(buildReportHtml(RUN, RESULT)).not.toContain("§03"); // no ceiling → identical report to before
    const cappedRun = { ...RUN, ceiling_pct: 0.15 };
    const cappedResult = { ...RESULT, band: { ...RESULT.band, ceiling_applied: true } };
    const html = buildReportHtml(cappedRun, cappedResult);
    expect(html).toContain("§03 ceiling applied — exit $/SF capped");
    expect(html).toContain("−15%");
    expect(html).toContain("15% §03 ceiling"); // the deal note line carries it too
  });
});

describe("i18n — es never falls back mid-sentence", () => {
  test("every en key has an es translation", () => {
    const missing = Object.keys(STRINGS.en).filter((k) => !(k in STRINGS.es));
    expect(missing).toEqual([]);
  });
  test("t falls back to en for unknown languages and keys", () => {
    expect(makeT("fr")("getTheBand")).toBe(STRINGS.en.getTheBand);
    expect(makeT("es")("definitely_not_a_key")).toBe("definitely_not_a_key");
  });
});

describe("store — recents are the contract", () => {
  let store;
  beforeEach(async () => {
    jest.resetModules();
    const asMod = require("@react-native-async-storage/async-storage");
    await (asMod.default ?? asMod).clear();
    store = require("../src/store");
    await store.load();
  });

  const runFor = (addr) => ({
    addressText: addr,
    address: { line: addr, city: "LA", state: "CA", zip: "" },
    subject: { square_feet: 1000 },
    comps: [{ id: "x", sale_price: 1, square_feet: 1, closed: true }],
  });

  test("re-running an address replaces its recent (flags included), newest first", () => {
    store.rememberRun(runFor("A st"));
    store.rememberRun(runFor("B st"));
    const updated = { ...runFor("A st"), comps: [{ id: "x", sale_price: 1, square_feet: 1, closed: false }] };
    store.rememberRun(updated);
    const r = store.recents();
    expect(r.map((x) => x.addressText)).toEqual(["A st", "B st"]);
    expect(r[0].comps[0].closed).toBe(false); // the re-run's testimony won
  });

  test("recents cap at 12", () => {
    for (let i = 0; i < 15; i++) store.rememberRun(runFor(`${i} st`));
    expect(store.recents()).toHaveLength(12);
    expect(store.recents()[0].addressText).toBe("14 st");
  });

  test("language persists and defaults safely", async () => {
    expect(store.getLang()).toBe("en");
    await store.setLang("es");
    expect(store.getLang()).toBe("es");
    await store.setLang("klingon");
    expect(store.getLang()).toBe("en"); // unknown → en, never undefined
  });
});
