// Engine calls — the ARV app computes nothing; engines decide, the app
// renders (BOBAI/trunk/ARV_APP_CONTRACT.md pins every shape used here).
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
// fields.comps[]. Candidates carry no closed/renovated truth — the user
// flags them (the curation step).
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
    candidates: (Array.isArray(f.comps) ? f.comps : [])
      .filter((c) => c && c.price > 0 && c.sqft > 0)
      .map((c, i) => ({
        id: c.address || `candidate #${i + 1}`,
        address: c.address || "",
        sale_price: c.price,
        square_feet: c.sqft,
        beds: c.beds ?? null,
        baths: c.baths ?? null,
        distanceMi: c.distanceMi ?? null,
        date: c.date ?? null,
        closed: false, // user testimony only — never assumed
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
export function arvAgent({ subject, comps, deal }) {
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
  return call("arv-agent", body);
}

// Live public-record permits for one address. Never cached server-side;
// { covered: false } is an honest answer, not an error.
export function permitHistory(address, city) {
  return call("permit-history", { address, city });
}
