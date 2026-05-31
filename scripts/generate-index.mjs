/**
 * Post-build script for Vercel deployment.
 *
 * TanStack Start with @lovable.dev/vite-tanstack-config skips the nitro
 * prerender step outside of Lovable's own hosting context, so no index.html
 * is generated. This script creates one from the compiled asset manifest.
 */
import { readdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";

const OUT = "dist/client";
const ASSETS = `${OUT}/assets`;

if (!existsSync(ASSETS)) {
  console.error(`[generate-index] ${ASSETS} not found — did the build run?`);
  process.exit(1);
}

const files = await readdir(ASSETS);

// The bootstrap entry is the smallest index-*.js (< 5 kB).
// The large index-*.js is the vendor/app bundle.
const indexFiles = files.filter(
  (f) => f.startsWith("index-") && f.endsWith(".js"),
);

// Pick the smallest one (likely the client bootstrap)
let entryJs = indexFiles[0];
if (indexFiles.length > 1) {
  const sizes = await Promise.all(
    indexFiles.map(async (f) => {
      const buf = await readFile(`${ASSETS}/${f}`);
      return { f, size: buf.length };
    }),
  );
  entryJs = sizes.sort((a, b) => a.size - b.size)[0].f;
}

const cssFile = files.find((f) => f.startsWith("styles-") && f.endsWith(".css"))
  ?? files.find((f) => f.endsWith(".css"));

// Also collect all other JS entry chunks (non-vendor, non-utility)
// TanStack Start may split the entry across multiple small chunks.
const shellFile = files.find((f) => f.includes("_shell") && f.endsWith(".js"));

console.log(`[generate-index] entry JS  : ${entryJs}`);
console.log(`[generate-index] shell JS  : ${shellFile ?? "none"}`);
console.log(`[generate-index] CSS       : ${cssFile ?? "none"}`);

const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MusicDibs Enterprise</title>
    <meta name="description" content="MusicDibs Enterprise — Plataforma B2B para campañas musicales con IA" />
    ${cssFile ? `<link rel="stylesheet" crossorigin href="/assets/${cssFile}" />` : ""}
    ${shellFile ? `<script type="module" crossorigin src="/assets/${shellFile}"></script>` : ""}
    <script type="module" crossorigin src="/assets/${entryJs}"></script>
  </head>
  <body>
  </body>
</html>
`;

await writeFile(`${OUT}/index.html`, html, "utf8");
console.log(`[generate-index] ✓ wrote ${OUT}/index.html`);
