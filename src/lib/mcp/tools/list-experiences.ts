// MCP tool: list the tenant's music experiences (share pages) with stats.
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authenticateTenant } from "../tenant-auth";
import { errorResult, jsonResult } from "../respond";

const apiKey = z
  .string()
  .min(1)
  .describe("Your MusicDibs tenant API key (mdb_live_…), from Settings → Developers.");

export default defineTool({
  name: "list_experiences",
  title: "List experiences",
  description:
    "List the tenant's music experience pages, most recent first, including the public share token and playback stats. Optionally filter by status (draft, published, archived).",
  inputSchema: {
    api_key: apiKey,
    status: z.enum(["draft", "published", "archived"]).optional().describe("Optional status filter."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ api_key, status, limit }) => {
    const auth = await authenticateTenant(api_key);
    if (!auth.ok) return errorResult(auth.message);
    const { supabase, tenantId } = auth.ctx;

    let query = supabase
      .from("experience_pages")
      .select(
        "id, experience_token, title, status, campaign_id, play_count, unique_visitors, completion_count, download_count, cta_click_count, cta_title, cta_url, created_at",
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return errorResult(`Could not list experiences: ${error.message}`);
    return jsonResult({ experiences: data ?? [], count: data?.length ?? 0 });
  },
});
