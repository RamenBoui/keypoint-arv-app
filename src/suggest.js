// Address autocomplete (X-03) — Photon (komoot), the OSM geocoder: free,
// CORS-open, no API key, which keeps the no-accounts/no-keys posture intact.
// Biased toward LA (the market); US-only results with a real house number.
// Fail-silent by design: suggestions are sugar — typing always works.
const PHOTON = "https://photon.komoot.io/api/";
const BIAS = { lat: 34.05, lon: -118.24 }; // Los Angeles

// Photon returns full state names; the app (and enrich) speak USPS codes.
const STATE_ABBR = {
  california: "CA", nevada: "NV", arizona: "AZ", oregon: "OR", washington: "WA",
  texas: "TX", florida: "FL", "new york": "NY", colorado: "CO", utah: "UT",
  idaho: "ID", "new mexico": "NM", georgia: "GA", "north carolina": "NC",
  illinois: "IL", pennsylvania: "PA", ohio: "OH", michigan: "MI",
  massachusetts: "MA", "new jersey": "NJ", virginia: "VA", tennessee: "TN",
};

let inflight = null;

// q → [{ label, address: { line, city, state, zip } }], best-first, ≤5.
// Aborts the previous request so a fast typist never gets stale rows.
export async function suggestAddresses(q) {
  const query = String(q ?? "").trim();
  if (query.length < 4) return [];
  try { inflight?.abort(); } catch {}
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  inflight = ctrl;
  try {
    const url =
      `${PHOTON}?q=${encodeURIComponent(query)}&limit=6&lang=en` +
      `&lat=${BIAS.lat}&lon=${BIAS.lon}`;
    const res = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
    if (!res.ok) return [];
    const json = await res.json();
    const out = [];
    const seen = new Set();
    for (const f of json.features ?? []) {
      const p = f.properties ?? {};
      if (p.countrycode !== "US") continue;
      if (!p.housenumber || !p.street) continue; // a band needs a parcel, not a street
      const city = p.city ?? p.town ?? p.district ?? p.village;
      if (!city) continue;
      const state = STATE_ABBR[String(p.state ?? "").toLowerCase()] ?? "CA";
      const line = `${p.housenumber} ${p.street}`;
      const label = `${line}, ${city}, ${state}${p.postcode ? ` ${p.postcode}` : ""}`;
      if (seen.has(label)) continue;
      seen.add(label);
      out.push({ label, address: { line, city, state, zip: p.postcode ?? "" } });
      if (out.length === 5) break;
    }
    return out;
  } catch {
    return []; // aborted or offline — the field is still just a text field
  }
}
