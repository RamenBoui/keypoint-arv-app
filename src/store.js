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

// One recent per address string; a re-run replaces it (flags included —
// comp flags are user testimony and must survive relaunch).
export function rememberRun({ addressText, address, subject, comps, deal }) {
  state.recents = [
    { addressText, address, subject, comps, deal: deal ?? null, at: new Date().toISOString() },
    ...state.recents.filter((r) => r.addressText !== addressText),
  ].slice(0, MAX_RECENTS);
  save();
}

export function clearAllLocal() {
  state = { recents: [] };
  save();
}
