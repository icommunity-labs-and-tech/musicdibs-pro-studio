// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

const isVercelBuild = process.env.VERCEL === "1";

export default defineConfig({
  // Emit a Vite manifest so the Vercel post-build step (scripts/generate-index.mjs)
  // can resolve the TRUE client entry chunk instead of guessing by file size.
  vite: {
    build: {
      manifest: true,
    },
    // MCP server (agent integrations) — generates /mcp + OAuth metadata routes
    // from src/lib/mcp/index.ts at build time. Vercel is intentionally a static
    // SPA deployment for enterprise.musicdibs.com; the working MCP endpoint is
    // served by Lovable at https://musicdibs-enterprise.lovable.app/mcp.
    plugins: isVercelBuild ? [] : [mcpPlugin()],
  },
  tanstackStart: {
    // Use a custom client entry so Vercel's static fallback can boot as a SPA
    // when no TanStack SSR hydration payload is present in index.html.
    client: { entry: "client" },
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // NOTE: SPA mode is intentionally NOT enabled. `spa.enabled` forces TanStack
    // Start's prerender step ON, which (in the nitro/cloudflare build) tries to
    // import dist/server/server.js AFTER nitro has already bundled it into
    // index.mjs — causing `ERR_MODULE_NOT_FOUND` and a failed production build.
    // The app is fully client-rendered (auth is guarded client-side, no route
    // loaders or server functions), so standard SSR is safe: the worker renders
    // the initial HTML and the client hydrates. Auth still lives in localStorage
    // via onAuthStateChange (client-only), and SSR improves landing-page SEO.
  },
});
