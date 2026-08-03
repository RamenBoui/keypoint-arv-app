// Deploy dist/ to the shared Supabase project's public storage bucket —
// the zero-new-credentials physical host (the Field app's original pattern).
// Live URL: <SUPABASE_URL>/storage/v1/object/public/arv-app/index.html
//
// Usage: SERVICE_KEY=$(cat .secrets/service-role-key) node scripts/deploy-storage.mjs
// Proper hosting is Cloudflare Pages (see .github/workflows/deploy.yml) —
// this path exists so a build can ship without waiting on CF secrets.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const BASE = "https://bbkeogzyqwszmijmvlmj.supabase.co";
const BUCKET = "arv-app";
const KEY = process.env.SERVICE_KEY;
if (!KEY) { console.error("set SERVICE_KEY"); process.exit(1); }

const TYPES = {
  ".html": "text/html", ".js": "application/javascript",
  ".css": "text/css", ".json": "application/json", ".ico": "image/x-icon",
  ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".map": "application/json",
};

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

// Ensure the bucket exists and is public (idempotent).
const bres = await fetch(`${BASE}/storage/v1/bucket`, {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
});
if (!bres.ok && bres.status !== 409) {
  const t = await bres.text();
  if (!t.includes("already exists")) { console.error("bucket:", bres.status, t); process.exit(1); }
}

const dist = new URL("../dist/", import.meta.url).pathname;
const files = walk(dist);
let ok = 0;
for (const file of files) {
  const key = relative(dist, file);
  const res = await fetch(`${BASE}/storage/v1/object/${BUCKET}/${key}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
      "x-upsert": "true",
      "cache-control": key.startsWith("_expo/") ? "max-age=3600" : "max-age=60", // hashed bundles cache; index stays fresh
    },
    body: readFileSync(file),
  });
  if (!res.ok) { console.error("upload failed:", key, res.status, await res.text()); process.exit(1); }
  ok++;
}
console.log(`deployed ${ok} files → ${BASE}/storage/v1/object/public/${BUCKET}/index.html`);
