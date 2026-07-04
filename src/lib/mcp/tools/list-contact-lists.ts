// MCP tool: list the tenant's contact lists.
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authenticateTenant } from "../tenant-auth";
import { errorResult, jsonResult } from "../respond";

const apiKey = z
  .string()
  .min(1)
  .describe("Your MusicDibs tenant API key (mdb_live_…), from Settings → Developers.");

export default defineTool({
  name: "list_contact_lists",
  title: "List contact lists",
  description: "List the tenant's contact lists (audiences) with their contact counts.",
  inputSchema: { api_key: apiKey },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ api_key }) => {
    const auth = await authenticateTenant(api_key);
    if (!auth.ok) return errorResult(auth.message);
    const { supabase, tenantId } = auth.ctx;

    const { data, error } = await supabase
      .from("contact_lists")
      .select("id, name, description, contact_count, tags, color, source, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) return errorResult(`Could not list contact lists: ${error.message}`);
    return jsonResult({ contact_lists: data ?? [], count: data?.length ?? 0 });
  },
});
