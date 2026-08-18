// Engine calls — the ARV app computes nothing; engines decide, the app
// renders (BOBAI/trunk/ARV_APP_CONTRACT.md pins every shape used here).
import { parseAddress } from "./util";
const BASE = "https://bbkeogzyqwszmijmvlmj.supabase.co/functions/v1";
// Publishable anon key — safe in the client (RLS + guest gates server-side).
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJia2VvZ3p5cXdzem1pam12bG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MDgzMjYsImV4cCI6MjA5ODE4NDMyNn0.hfaZ4zhZbUAKvN9KKmSRCrts1H-atv1Yg1CTEpcSeh4";

export async function call(fn, body) {
  const res = await fetch(`${BASE}/${fn}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ANON}`,
      apikey: ANON,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, ...json };
}

// Subject facts + candidate comps. Address is an OBJECT, not a string.
// Read paths are contract-pinned: fields.physical.*, fields.valuation.*,
// fields.comps[]. Flag provenance (2026-08-06, Jeffrey — the §05 public-
// record path): a deed-verified sale arrives as closed:true with
// closed_source "public_record" and the RECORDED price replacing asking;
// an Inactive/removed listing arrives as likely_sold — a SUGGESTION the
// user confirms. Everything else stays user testimony, never assumed.
export async function enrich(address) {
  const r = await call("aipro-enrich", { address });
  if (!r.ok || !r.fields) return { ok: false, status: r.status, error: r.error };
  const f = r.fields;
  return {
    ok: true,
    resolvedAddress: typeof r.address === "string" ? r.address : null,
    sqft: f.physical?.sqft ?? null,
    lotSqft: f.physical?.lotSqft ?? null,
    beds: f.physical?.beds ?? null,
    baths: f.physical?.baths ?? null,
    yearBuilt: f.physical?.yearBuilt ?? null,
    asIsAvm: f.valuation?.asIsAvm ?? null,
    marketRent: f.rental?.marketRent ?? null,
    candidates: (Array.isArray(f.comps) ? f.comps : [])
      .filter((c) => c && c.price > 0 && c.sqft > 0)
      .map((c, i) => ({
        id: c.address || `candidate #${i + 1}`,
        address: c.address || "",
        sale_price: c.sold_price ?? c.price, // recorded price beats asking
        square_feet: c.sqft,
        beds: c.beds ?? null,
        baths: c.baths ?? null,
        distanceMi: c.distanceMi ?? null,
        date: c.date ?? null,
        closed: c.sold_verified === true, // deed-verified only; still editable
        closed_source: c.sold_verified === true ? "public_record" : null,
        sold_date: c.sold_date ?? null,
        likely_sold: c.sold_verified !== true && (c.listing_status === "Inactive" || !!c.removed_date),
        renovated: false,
        included: true,
        source: "enrich",
      })),
  };
}

// The valuation brain: band / breakeven / tier matrix. Pure and cheap —
// re-run on every flag change. Posture is derived HERE, at the engine door:
// any enrich-sourced comp makes the evidence public_record; a fully
// hand-entered set is client_input.
export function arvAgent({ subject, comps, deal, ceiling_pct }) {
  const body = {
    subject,
    comps: comps.map((c) => ({
      sale_price: c.sale_price,
      square_feet: c.square_feet,
      closed: c.closed === true,
      renovated: c.renovated === true,
      id: c.id,
    })),
    posture: comps.some((c) => c.source === "enrich") ? "public_record" : "client_input",
  };
  if (deal) body.deal = deal;
  // §03 permanent-inferiority ceiling — rides only when the user set one, so
  // a run without it sends the exact body it always has.
  if (typeof ceiling_pct === "number" && ceiling_pct > 0) body.permanent_inferiority_pct = ceiling_pct;
  return call("arv-agent", body);
}

// File the run to Records (AV-16, save-arv-record 2026-08-18): the curated
// comps ride WHOLE — flags and provenance are the testimony — beside the
// band the engine returned. One row per property, re-filing refreshes it;
// the record lands on the property's project timeline (kind arv_report).
export function saveArvRecord(run, result) {
  return call("save-arv-record", {
    address: run.addressText,
    subject: run.subject,
    comps: run.comps,
    deal: run.deal ?? null,
    ceiling_pct: typeof run.ceiling_pct === "number" && run.ceiling_pct > 0 ? run.ceiling_pct : null,
    posture: result?.posture ?? null,
    band: result?.band ?? null,
    breakeven: result?.breakeven ?? null,
    tiers: result?.tiers ?? null,
    footer: result?.footer ?? null,
    saved_by: "arv-app",
  });
}

// Live public-record permits for one address. Never cached server-side;
// { covered: false } is an honest answer, not an error.
export function permitHistory(address, city) {
  return call("permit-history", { address, city });
}

// ---- Context modes (scope-agent) — the "why is the band what it is" layer.

// Market scope: what the SOLD set already delivered at this price point.
// Reads each comp's live permits (+ photos when supplied) — slow by design;
// the caller shows a takes-a-minute state. Studies persist server-side.
export function marketScope(comps, fallbackCity) {
  return call("scope-agent", {
    mode: "market_scope",
    comps: comps.map((c) => ({
      // the engine needs city as its own field to reach the permit feed —
      // comp addresses carry it inline, so parse it out (fallback: subject's)
      address: c.address,
      city: parseAddress(c.address)?.city ?? fallbackCity ?? null,
      sale_price: c.sale_price,
      square_feet: c.square_feet,
    })),
  });
}

// Permit trends for the area — deterministic counting, no MLS, honest about
// zip filters and row caps.
export function marketTrends(city, zip) {
  return call("scope-agent", { mode: "market_trends", city, ...(zip ? { zip } : {}) });
}

// Stuck-listing diagnostic — the computed market half (price vs demonstrated
// ceiling, DOM vs sold median, cuts logic). Photos deliberately omitted in
// v1: the caller must lawfully hold them, and the computed half already
// carries the sharpest signals.
export function listingDiagnostic({ list_price, square_feet, days_on_market, price_cuts }, comps) {
  return call("scope-agent", {
    mode: "listing_diagnostic",
    listing: { list_price, square_feet, days_on_market, price_cuts },
    comps: comps.map((c) => ({
      address: c.address,
      sale_price: c.sale_price,
      square_feet: c.square_feet,
    })),
  });
}
