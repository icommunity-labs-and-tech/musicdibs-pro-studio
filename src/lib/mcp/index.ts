import { defineMcp } from "@lovable.dev/mcp-js";
import getExperienceTool from "./tools/get-experience";

// MusicDibs MCP server — exposes the app's PUBLIC surface to AI assistants.
//
// This server ships without OAuth: every tool here reads only data that is
// already public (published experiences via their share token). Tools that
// touch private, per-tenant dashboard data (campaigns, contacts, analytics)
// are intentionally NOT exposed, because that requires per-user OAuth and a
// Supabase OAuth 2.1 authorization server, which is not provisioned for this
// project.
//
// Keep this module import-safe: no env reads, I/O, or throwing at top level.
export default defineMcp({
  name: "musicdibs-mcp",
  title: "MusicDibs MCP",
  version: "0.1.0",
  instructions:
    "Tools for MusicDibs, an AI music experience layer. Use `get_experience` to fetch a published music experience by its public share token (the token from a /play/{token} link).",
  tools: [getExperienceTool],
});
