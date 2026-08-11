// Local-first app state (Field/DD pattern): recents + curated comp sets live
// on the device; no server table for app state in Phase 1.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { LANGS } from "./i18n";

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
  return LANGS.includes(state.lang) ? state.lang : "en";
}

export async function setLang(lang) {
  state.lang = LANGS.includes(lang) ? lang : "en";
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

// Cross-instance language sync (web). AsyncStorage's web backend writes
// straight to localStorage, and the browser fires `storage` in every OTHER
// same-origin context (tabs, harness panes) when the key changes — so a
// language pick anywhere applies everywhere at once, no reload. Native has a
// single instance and needs none of this.
export function onExternalLangChange(cb) {
  if (Platform.OS !== "web" || typeof window === "undefined") return () => {};
  const handler = (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const next = JSON.parse(e.newValue);
      if (LANGS.includes(next.lang) && next.lang !== state.lang) {
        state.lang = next.lang;
        cb(next.lang);
      }
    } catch {}
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
