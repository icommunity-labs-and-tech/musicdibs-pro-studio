// MCP tool: account/tenant overview for the authenticated tenant.
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authenticateTenant } from "../tenant-auth";
import { errorResult, jsonResult } from "../respond";

const apiKey = z
  .string()
  .min(1)
  .describe("Your MusicDibs tenant API key (mdb_live_…), from Settings → Developers.");

export default defineTool({
  name: "get_account",
  title: "Get account",
  description:
    "Return the MusicDibs account (tenant) profile for the given API key: name, slug, industry vertical, plan and setup status.",
  inputSchema: { api_key: apiKey },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ api_key }) => {
    const auth = await authenticateTenant(api_key);
    if (!auth.ok) return errorResult(auth.message);
    const { supabase, tenantId } = auth.ctx;

    const { data, error } = await supabase
      .from("tenants")
      .select("id, name, slug, vertical, plan, setup_complete, created_at")
      .eq("id", tenantId)
      .maybeSingle();

    if (error) return errorResult(`Could not load account: ${error.message}`);
    if (!data) return errorResult("Account not found for this API key.");
    return jsonResult({ account: data });
  },
});
