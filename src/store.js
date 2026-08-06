// Local-first app state (Field/DD pattern): recents + curated comp sets live
// on the device; no server table for app state in Phase 1.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "keypoint-arv:v1";
const MAX_RECENTS = 12;

let state = { recents: [] };
let loaded = false;

export async function load() {
  if (loaded) return state;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) state = { recents: [], ...JSON.parse(raw) };
  } catch {}
  loaded = true;
  return state;
}

async function save() {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function recents() {
  return state.recents;
}

export function getLang() {
  return state.lang === "es" ? "es" : "en";
}

export async function setLang(lang) {
  state.lang = lang === "es" ? "es" : "en";
  await save();
}

// One recent per address string; a re-run replaces it (flags included —
// comp flags are user testimony and must survive relaunch).
export function rememberRun({ addressText, address, subject, comps, deal, ceiling_pct }) {
  state.recents = [
    {
      addressText, address, subject, comps, deal: deal ?? null,
      // §03 ceiling persists only when set — unset runs keep the old shape.
      ...(typeof ceiling_pct === "number" && ceiling_pct > 0 ? { ceiling_pct } : {}),
      at: new Date().toISOString(),
    },
    ...state.recents.filter((r) => r.addressText !== addressText),
  ].slice(0, MAX_RECENTS);
  save();
}

export function clearAllLocal() {
  state = { recents: [] };
  save();
}
