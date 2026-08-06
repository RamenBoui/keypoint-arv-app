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
// Forgiving (X-03): collapses stray whitespace, accepts "City CA 90036"
// jammed into one comma segment, and tolerates a trailing zip/state.
export function parseAddress(raw) {
  const cleaned = String(raw).replace(/\s+/g, " ").trim();
  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const line = parts[0];
  let city = parts[1];
  let state = "CA";
  let zip = "";
  // state/zip riding at the end of the city segment ("Los Angeles CA 90036")
  const tail = city.match(/^(.*?)(?:\s+([A-Za-z]{2}))?(?:\s+(\d{5}))?$/);
  if (tail) {
    if (tail[2] && tail[2].toUpperCase() !== "LA") { city = tail[1]; state = tail[2].toUpperCase(); }
    if (tail[3]) { city = (tail[1] || city).trim(); zip = tail[3]; }
  }
  if (parts[2]) {
    const m = parts[2].match(/^([A-Za-z]{2})?\s*(\d{5})?/);
    if (m) {
      if (m[1]) state = m[1].toUpperCase();
      if (m[2]) zip = m[2];
    }
  }
  return { line, city: city.trim(), state, zip };
}

export const numOrNull = (s) => {
  const n = parseFloat(String(s).replace(/[$,]/g, ""));
  return isFinite(n) && n > 0 ? n : null;
};

// Calendar days in the user's own timezone — ISO timestamps are UTC and
// read a day ahead every evening west of Greenwich.
const dayFmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayLocalISO = () => dayFmt(new Date());
export function localDayOf(iso) {
  const d = new Date(iso);
  return isFinite(d) ? dayFmt(d) : "—";
}
