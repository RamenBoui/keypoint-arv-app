// Auto-evidence for the Renovated flag (Jeffrey, 2026-08-11): at curate time
// each enrich-sourced comp quietly checks its live permit record; remodel-type
// permits issued in the 4 years before the sale surface as a hint next to the
// Renovated toggle. Display-only by design — it never flips the flag, never
// rides the engine call, never travels in a share link. Testimony stays the
// user's; this just puts the public-record evidence in front of them.
import { permitHistory } from "./api";
import { parseAddress } from "./util";

const REMODEL_RX = /remodel|renovat|rehab|kitchen|bath|addition|alter|adu|upgrade|reroof|re-roof/i;
const WINDOW_MS = 4 * 365 * 24 * 3600 * 1000; // permits older than ~4y before sale say little about sold condition

// In-memory only (the permit engine is live-by-design; no cross-session cache).
const cache = new Map(); // addressText -> Promise<{count, year} | null>

export function remodelHint(addressText, fallbackCity, saleDateStr) {
  if (cache.has(addressText)) return cache.get(addressText);
  const p = (async () => {
    const parsed = parseAddress(addressText);
    const city = parsed?.city ?? fallbackCity;
    if (!city) return null;
    const r = await permitHistory(parsed?.line ?? addressText, city).catch(() => null);
    if (!r || r.ok === false || r.covered === false) return null;
    const sale = Date.parse(String(saleDateStr ?? "").slice(0, 10));
    const end = isFinite(sale) ? sale : Date.now();
    const hits = (r.permits ?? []).filter((pm) => {
      const dt = Date.parse(String(pm.issued_date ?? "").slice(0, 10));
      if (!isFinite(dt) || dt > end || end - dt > WINDOW_MS) return false;
      return REMODEL_RX.test(`${pm.type ?? ""} ${pm.description ?? ""}`);
    });
    if (!hits.length) return null;
    const year = hits.map((pm) => String(pm.issued_date).slice(0, 4)).sort().pop();
    return { count: hits.length, year };
  })();
  cache.set(addressText, p);
  return p;
}
