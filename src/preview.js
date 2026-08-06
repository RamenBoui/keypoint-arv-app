// Preview deep-links: #screen=comps|answer|compare opens that screen
// directly with a demo run, so a harness page can render every screen of the
// app side by side. Unlike share links the hash is KEPT: a dev-server reload
// (HMR) must land the pane back on the same screen. Demo data is plainly
// labeled and flows through the real engine — nothing here computes.
import { Platform } from "react-native";

const demoComps = [
  { id: "739 Champion Pl, Alhambra", address: "739 Champion Pl, Alhambra, CA 91801", sale_price: 739000, square_feet: 1102, closed: true, renovated: true, date: "2026-06-14", source: null, included: true },
  { id: "768 S Curtis Ave, Alhambra", address: "768 S Curtis Ave, Alhambra, CA 91803", sale_price: 768500, square_feet: 1215, closed: true, renovated: true, date: "2026-05-30", source: null, included: true },
  { id: "701 S 6th St, Alhambra", address: "701 S 6th St, Alhambra, CA 91801", sale_price: 701000, square_feet: 1180, closed: true, renovated: false, date: "2026-07-02", source: null, included: true },
  { id: "825 S Marguerita Ave, Alhambra", address: "825 S Marguerita Ave, Alhambra, CA 91803", sale_price: 825000, square_feet: 1390, closed: true, renovated: true, date: "2026-06-21", source: null, included: true },
  { id: "779 W Shorb St, Alhambra", address: "779 W Shorb St, Alhambra, CA 91803", sale_price: 779000, square_feet: 1240, closed: false, renovated: true, date: "2026-07-18", source: null, included: true },
];

export const DEMO_RUNS = [
  {
    addressText: "1124 Demo Ave, Alhambra, CA 91801",
    address: { line: "1124 Demo Ave", city: "Alhambra", state: "CA", zip: "91801" },
    subject: { square_feet: 1124, total_sf_after: 1560, asIsAvm: 685000, marketRent: 3150 },
    comps: demoComps,
    deal: { purchase_price: 640000, build_cost: 145000, term_months: 6 },
    enriched: false,
  },
  {
    addressText: "1420 Sample St, Rosemead, CA 91770",
    address: { line: "1420 Sample St", city: "Rosemead", state: "CA", zip: "91770" },
    subject: { square_feet: 1420, total_sf_after: null, asIsAvm: 742000, marketRent: 3400 },
    comps: demoComps.map((c) => ({ ...c, id: `${c.id} (B)` })),
    deal: null,
    enriched: false,
  },
];

export function takePreviewScreen() {
  if (Platform.OS !== "web" || typeof location === "undefined") return null;
  const m = location.hash.match(/^#screen=(comps|answer|compare)$/);
  return m ? m[1] : null;
}
