// MCP tool: update an existing contact for the tenant.
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authenticateTenant } from "../tenant-auth";
import { errorResult, jsonResult } from "../respond";

const apiKey = z
  .string()
  .min(1)
  .describe("Your MusicDibs tenant API key (mdb_live_…), from Settings → Developers.");

export default defineTool({
  name: "update_contact",
  title: "Update contact",
  description:
    "Update fields of an existing contact belonging to the tenant. Only provided fields are changed.",
  inputSchema: {
    api_key: apiKey,
    contact_id: z.string().uuid().describe("The contact id (uuid)."),
    email: z.string().trim().email().max(255).optional(),
    first_name: z.string().trim().max(120).optional(),
    last_name: z.string().trim().max(120).optional(),
    company: z.string().trim().max(160).optional(),
    phone: z.string().trim().max(40).optional(),
    list_id: z.string().uuid().nullable().optional().describe("Set to null to detach from its list."),
    status: z.enum(["active", "unsubscribed", "bounced", "cleaned"]).optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ api_key, contact_id, ...fields }) => {
    const auth = await authenticateTenant(api_key);
    if (!auth.ok) return errorResult(auth.message);
    const { supabase, tenantId } = auth.ctx;

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    if (Object.keys(updates).length === 0) {
      return errorResult("No fields provided to update.");
    }

    const { data, error } = await supabase
      .from("contacts")
      .update(updates)
      .eq("tenant_id", tenantId)
      .eq("id", contact_id)
      .select("id, email, first_name, last_name, company, phone, status, list_id, updated_at")
      .maybeSingle();

    if (error) return errorResult(`Could not update contact: ${error.message}`);
    if (!data) return errorResult("Contact not found for this tenant.");
    return jsonResult({ contact: data });
  },
});
