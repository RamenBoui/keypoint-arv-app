// Display formatting only — every business number comes from an engine.

export function fmtMoney(n) {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function fmtMoneyFull(n) {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function fmtPsf(n) {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  return `$${Math.round(n)}/SF`;
}

export function fmtInt(n) {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}

// "1257 Inspiration Point, West Covina, CA 91791" → enrich address object.
export function parseAddress(raw) {
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const line = parts[0];
  const city = parts[1];
  let state = "CA";
  let zip = "";
  if (parts[2]) {
    const m = parts[2].match(/^([A-Za-z]{2})?\s*(\d{5})?/);
    if (m) {
      if (m[1]) state = m[1].toUpperCase();
      if (m[2]) zip = m[2];
    }
  }
  return { line, city, state, zip };
}

export const numOrNull = (s) => {
  const n = parseFloat(String(s).replace(/[$,]/g, ""));
  return isFinite(n) && n > 0 ? n : null;
};
