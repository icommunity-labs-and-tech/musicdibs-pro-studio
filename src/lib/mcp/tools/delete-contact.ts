// MCP tool: delete a contact belonging to the tenant.
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authenticateTenant } from "../tenant-auth";
import { errorResult, jsonResult } from "../respond";

const apiKey = z
  .string()
  .min(1)
  .describe("Your MusicDibs tenant API key (mdb_live_…), from Settings → Developers.");

export default defineTool({
  name: "delete_contact",
  title: "Delete contact",
  description:
    "Permanently delete a contact belonging to the tenant. This cannot be undone.",
  inputSchema: {
    api_key: apiKey,
    contact_id: z.string().uuid().describe("The contact id (uuid) to delete."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: true, openWorldHint: false },
  handler: async ({ api_key, contact_id }) => {
    const auth = await authenticateTenant(api_key);
    if (!auth.ok) return errorResult(auth.message);
    const { supabase, tenantId } = auth.ctx;

    const { data, error } = await supabase
      .from("contacts")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", contact_id)
      .select("id, email")
      .maybeSingle();

    if (error) return errorResult(`Could not delete contact: ${error.message}`);
    if (!data) return errorResult("Contact not found for this tenant.");
    return jsonResult({ deleted: data });
  },
});
