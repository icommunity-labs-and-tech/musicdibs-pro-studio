/**
 * Vercel serves this project as a static SPA (`dist/client`). It does not run
 * TanStack server routes, so MCP server routes must not be part of the Vercel
 * route graph. The MCP stays available on Lovable's Worker domain:
 * https://musicdibs-enterprise.lovable.app/mcp
 */
import { rm } from "fs/promises";

if (process.env.VERCEL !== "1") {
  process.exit(0);
}

const generatedMcpRoutes = [
  "src/routes/mcp.ts",
  "src/routes/[.mcp]",
  "src/routes/[.well-known]/oauth-protected-resource.ts",
];

await Promise.all(
  generatedMcpRoutes.map((path) => rm(path, { recursive: true, force: true })),
);

console.log("[prepare-vercel-build] Removed MCP server routes for static Vercel build.");