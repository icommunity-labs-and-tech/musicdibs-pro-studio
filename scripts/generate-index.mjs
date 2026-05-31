/**
 * Post-build script for Vercel deployment.
 *
 * TanStack Start with @lovable.dev/vite-tanstack-config skips the nitro
 * prerender step outside of Lovable's own hosting context, so no index.html
 * is generated. This script creates one from the compiled asset manifest.
 *
 * IMPORTANT: we resolve the client entry from Vite's manifest.json (isEntry
 * flag), NOT by guessing the smallest index-*.js. The previous size-based
 * heuristic picked a tiny utility chunk instead of the real bootstrap, so
 * React never mounted and TanStack Router crashed with "Invariant failed".
 */
import { readdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";

const OUT = "dist/client";
const ASSETS = `${OUT}/assets`;
const MANIFEST = `${OUT}/.vite/manifest.json`;

if (!existsSync(ASSETS)) {
  console.error(`[generate-index] ${ASSETS} not found — did the build run?`);
  process.exit(1);
}

/**
 * Resolve the real client entry (and its CSS) from the Vite manifest.
 * Returns { entryJs, cssFiles, imports } or null if no manifest/entry found.
 */
async function resolveFromManifest() {
  if (!existsSync(MANIFEST)) return null;

  let manifest;
  try {
    manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch (err) {
    console.warn(`[generate-index] could not parse manifest: ${err.message}`);
    return null;
  }

  // Find the entry chunk. Prefer one that isEntry AND looks like the client
  // bootstrap (has the largest set of imports / largest file is the app shell).
  const entries = Object.values(manifest).filter((c) => c.isEntry);
  if (entries.length === 0) return null;

  // Score entries by sizing of their dependency graph so we pick the real app
  // bootstrap rather than an incidental entry. The bootstrap pulls in the most
  // imports.
  const pickEntry = entries
    .map((c) => ({ c, score: (c.imports?.length ?? 0) + (c.dynamicImports?.length ?? 0) }))
    .sort((a, b) => b.score - a.score)[0].c;

  // Collect CSS that belongs to the entry and all of its (transitive) imports.
  const cssFiles = new Set();
  const visited = new Set();
  const collect = (key) => {
    if (!key || visited.has(key)) return;
    visited.add(key);
    const chunk = manifest[key];
    if (!chunk) return;
    (chunk.css ?? []).forEach((f) => cssFiles.add(f));
    (chunk.imports ?? []).forEach(collect);
  };
  // Find the manifest key for the chosen entry to walk its imports.
  const entryKey = Object.keys(manifest).find((k) => manifest[k] === pickEntry);
  collect(entryKey);

  return { entryJs: pickEntry.file, cssFiles: [...cssFiles] };
}

let entryJs;
let cssFiles = [];

const fromManifest = await resolveFromManifest();
if (fromManifest) {
  entryJs = fromManifest.entryJs;
  cssFiles = fromManifest.cssFiles;
  console.log(`[generate-index] resolved entry from manifest: ${entryJs}`);
} else {
  // Fallback: scan the assets dir. Pick the LARGEST index-*.js, which is the
  // bundled app/vendor entry (the smallest is a stray utility chunk).
  console.warn("[generate-index] no manifest — falling back to asset scan");
  const files = await readdir(ASSETS);
  const indexFiles = files.filter((f) => f.startsWith("index-") && f.endsWith(".js"));
  const sized = await Promise.all(
    indexFiles.map(async (f) => ({ f, size: (await readFile(`${ASSETS}/${f}`)).length })),
  );
  entryJs = sized.sort((a, b) => b.size - a.size)[0]?.f;
  const css = files.find((f) => f.startsWith("styles-") && f.endsWith(".css"))
    ?? files.find((f) => f.endsWith(".css"));
  cssFiles = css ? [`assets/${css}`] : [];
}

if (!entryJs) {
  console.error("[generate-index] could not determine client entry — aborting.");
  process.exit(1);
}

// The global stylesheet (src/styles.css) is imported via `?url` and injected by
// the router at runtime, so it isn't part of the entry's manifest graph. Add it
// explicitly to avoid a flash of unstyled content before hydration.
if (cssFiles.length === 0) {
  const files = await readdir(ASSETS);
  const css = files.find((f) => f.startsWith("styles-") && f.endsWith(".css"))
    ?? files.find((f) => f.endsWith(".css"));
  if (css) cssFiles = [`assets/${css}`];
}

const entryHref = entryJs.startsWith("assets/") ? `/${entryJs}` : `/assets/${entryJs}`;
const cssLinks = cssFiles
  .map((f) => {
    const href = f.startsWith("assets/") ? `/${f}` : `/assets/${f}`;
    return `<link rel="stylesheet" crossorigin href="${href}" />`;
  })
  .join("\n    ");

console.log(`[generate-index] entry JS  : ${entryHref}`);
console.log(`[generate-index] CSS       : ${cssFiles.join(", ") || "none"}`);

const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MusicDibs Enterprise</title>
    <meta name="description" content="MusicDibs Enterprise — Plataforma B2B para campañas musicales con IA" />
    ${cssLinks}
    <script type="module" crossorigin src="${entryHref}"></script>
  </head>
  <body>
  </body>
</html>
`;

await writeFile(`${OUT}/index.html`, html, "utf8");
console.log(`[generate-index] ✓ wrote ${OUT}/index.html`);
