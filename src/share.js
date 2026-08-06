// Share a run as a URL (RA-07) with ZERO server state: the whole curated
// run — flags included, they're the testimony — rides the fragment, so the
// link works forever, needs no account, and nothing is stored anywhere.
// Fragment (#) not query: it never reaches any server log.
import { Platform } from "react-native";

const strip = (run) => ({
  a: run.addressText,
  ad: run.address,
  s: {
    sf: run.subject.square_feet,
    after: run.subject.total_sf_after ?? null,
    avm: run.subject.asIsAvm ?? null,
    rent: run.subject.marketRent ?? null,
  },
  c: run.comps.map((c) => ({
    id: c.id, ad: c.address, p: c.sale_price, sf: c.square_feet,
    cl: c.closed ? 1 : 0, rn: c.renovated ? 1 : 0, d: c.date ?? null, src: c.source ?? null,
  })),
  d: run.deal ?? null,
  // §03 ceiling rides only when set — links without it stay byte-identical
  // to the ones already in the wild.
  ...(typeof run.ceiling_pct === "number" && run.ceiling_pct > 0 ? { pi: run.ceiling_pct } : {}),
});

const expand = (x) => ({
  addressText: x.a,
  address: x.ad,
  subject: {
    square_feet: x.s?.sf ?? null,
    total_sf_after: x.s?.after ?? null,
    asIsAvm: x.s?.avm ?? null,
    marketRent: x.s?.rent ?? null,
  },
  comps: (x.c ?? []).map((c) => ({
    id: c.id, address: c.ad ?? "", sale_price: c.p, square_feet: c.sf,
    closed: c.cl === 1, renovated: c.rn === 1, date: c.d ?? null, source: c.src ?? null,
  })),
  deal: x.d ?? null,
  ceiling_pct: typeof x.pi === "number" && x.pi > 0 ? x.pi : null,
  enriched: (x.c ?? []).some((c) => c.src === "enrich"),
});

const b64u = {
  enc: (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))),
};

export function shareUrl(run) {
  if (Platform.OS !== "web" || typeof location === "undefined") return null;
  return `${location.origin}${location.pathname}#run=${b64u.enc(JSON.stringify(strip(run)))}`;
}

export async function copyShareUrl(run) {
  const url = shareUrl(run);
  if (!url) return false;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

// A shared link opens straight into the run it encodes (the hash is cleared
// so refresh/back behave normally afterwards).
export function takeSharedRun() {
  if (Platform.OS !== "web" || typeof location === "undefined") return null;
  const m = location.hash.match(/^#run=([\w-]+)$/);
  if (!m) return null;
  try {
    const run = expand(JSON.parse(b64u.dec(m[1])));
    history.replaceState(null, "", location.pathname + location.search);
    if (!run.addressText || !Array.isArray(run.comps)) return null;
    return run;
  } catch {
    return null;
  }
}
