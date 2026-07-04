// MCP tool: create a contact list (audience) for the tenant.
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authenticateTenant } from "../tenant-auth";
import { errorResult, jsonResult } from "../respond";

const apiKey = z
  .string()
  .min(1)
  .describe("Your MusicDibs tenant API key (mdb_live_…), from Settings → Developers.");

export default defineTool({
  name: "create_contact_list",
  title: "Create contact list",
  description: "Create a new manual contact list (audience) for the tenant.",
  inputSchema: {
    api_key: apiKey,
    name: z.string().trim().min(1).max(120).describe("List name."),
    description: z.string().trim().max(500).optional().describe("Optional description."),
    color: z.string().trim().max(20).optional().describe("Optional hex color, e.g. #14b8a6."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ api_key, name, description, color }) => {
    const auth = await authenticateTenant(api_key);
    if (!auth.ok) return errorResult(auth.message);
    const { supabase, tenantId } = auth.ctx;

    const { data, error } = await supabase
      .from("contact_lists")
      .insert({
        tenant_id: tenantId,
        name,
        description: description ?? null,
        color: color ?? null,
        source: "manual",
        contact_count: 0,
      })
      .select("id, name, description, color, source, contact_count, created_at")
      .single();

    if (error) return errorResult(`Could not create contact list: ${error.message}`);
    return jsonResult({ contact_list: data });
  },
});
