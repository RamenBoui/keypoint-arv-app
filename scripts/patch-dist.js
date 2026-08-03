// Post-export patch: expo export writes root-absolute asset paths, which only
// work at a domain root. The storage-bucket host serves under a path prefix,
// so everything becomes relative (same fix as the Field app's patch-dist).
const fs = require("fs");
const path = require("path");

const dist = path.join(__dirname, "..", "dist");
const htmlPath = path.join(dist, "index.html");
let html = fs.readFileSync(htmlPath, "utf8");

html = html.replace('href="/favicon.ico"', 'href="./favicon.ico"');
html = html.replace(/src="\/_expo\//g, 'src="./_expo/');

if (!html.includes("viewport-fit=cover")) {
  html = html.replace("shrink-to-fit=no", "shrink-to-fit=no, viewport-fit=cover, maximum-scale=1");
}
// Installable + shareable (QoL 2026-08-03): manifest/icons make
// Add-to-Home-Screen real on both platforms; OG tags give texted share
// links a proper preview card instead of a bare URL.
const SITE = "https://ramenboui.github.io/keypoint-arv-app";
for (const f of ["icon.png", "icon-192.png", "icon-512.png"]) {
  fs.copyFileSync(path.join(__dirname, "..", "assets", f), path.join(dist, f));
}
fs.writeFileSync(path.join(dist, "manifest.webmanifest"), JSON.stringify({
  name: "Keypoint ARV",
  short_name: "Keypoint ARV",
  start_url: "./",
  scope: "./",
  display: "standalone",
  background_color: "#faf6ee",
  theme_color: "#faf6ee",
  icons: [
    { src: "./icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "./icon-512.png", sizes: "512x512", type: "image/png" },
  ],
}, null, 2));
if (!html.includes('rel="manifest"')) {
  html = html.replace("</head>", `  <link rel="manifest" href="./manifest.webmanifest" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="Keypoint ARV" />
  <link rel="apple-touch-icon" href="./icon.png" />
  <meta name="description" content="Address in, defensible band out — after-renovation value with the evidence attached. Free, no account." />
  <meta property="og:title" content="Keypoint ARV — what will it be worth?" />
  <meta property="og:description" content="After-renovation value band with comps, permits, and breakeven — free, no account." />
  <meta property="og:image" content="${SITE}/icon-512.png" />
  <meta property="og:url" content="${SITE}/" />
  <meta name="twitter:card" content="summary" />
</head>`);
}
fs.writeFileSync(htmlPath, html);
console.log("patched dist/: relative paths + manifest/icons + OG meta");
