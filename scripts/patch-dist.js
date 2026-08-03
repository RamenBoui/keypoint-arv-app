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
fs.writeFileSync(htmlPath, html);
console.log("patched dist/: relative asset paths");
