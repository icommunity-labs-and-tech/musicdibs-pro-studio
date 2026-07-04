// MCP tool: list campaigns for the authenticated tenant.
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authenticateTenant } from "../tenant-auth";
import { errorResult, jsonResult } from "../respond";

const apiKey = z
  .string()
  .min(1)
  .describe("Your MusicDibs tenant API key (mdb_live_…), from Settings → Developers.");

export default defineTool({
  name: "list_campaigns",
  title: "List campaigns",
  description:
    "List the tenant's campaigns, most recent first. Optionally filter by status. Returns core fields plus engagement rates.",
  inputSchema: {
    api_key: apiKey,
    status: z
      .string()
      .optional()
      .describe("Optional status filter, e.g. draft, queued, generating, sent."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ api_key, status, limit }) => {
    const auth = await authenticateTenant(api_key);
    if (!auth.ok) return errorResult(auth.message);
    const { supabase, tenantId } = auth.ctx;

    let query = supabase
      .from("campaigns")
      .select(
        "id, name, type, campaign_type, vertical, status, delivery_channel, total_contacts, generated_count, open_rate, play_rate, completion_rate, click_rate, sent_at, created_at",
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return errorResult(`Could not list campaigns: ${error.message}`);
    return jsonResult({ campaigns: data ?? [], count: data?.length ?? 0 });
  },
});
