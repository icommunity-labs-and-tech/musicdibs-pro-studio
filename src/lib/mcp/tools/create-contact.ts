// MCP tool: create a contact for the tenant.
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authenticateTenant } from "../tenant-auth";
import { errorResult, jsonResult } from "../respond";

const apiKey = z
  .string()
  .min(1)
  .describe("Your MusicDibs tenant API key (mdb_live_…), from Settings → Developers.");

export default defineTool({
  name: "create_contact",
  title: "Create contact",
  description:
    "Create a contact for the tenant, optionally attaching it to a contact list. Email is required.",
  inputSchema: {
    api_key: apiKey,
    email: z.string().trim().email().max(255).describe("Contact email address."),
    first_name: z.string().trim().max(120).optional().describe("First name."),
    last_name: z.string().trim().max(120).optional().describe("Last name."),
    company: z.string().trim().max(160).optional().describe("Company."),
    phone: z.string().trim().max(40).optional().describe("Phone number (E.164 recommended)."),
    list_id: z.string().uuid().optional().describe("Optional contact list id to attach to."),
    status: z
      .enum(["active", "unsubscribed", "bounced", "cleaned"])
      .optional()
      .describe("Contact status (default active)."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ api_key, email, first_name, last_name, company, phone, list_id, status }) => {
    const auth = await authenticateTenant(api_key);
    if (!auth.ok) return errorResult(auth.message);
    const { supabase, tenantId } = auth.ctx;

    if (list_id) {
      const { data: list } = await supabase
        .from("contact_lists")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("id", list_id)
        .maybeSingle();
      if (!list) return errorResult("The given list_id does not belong to this tenant.");
    }

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        tenant_id: tenantId,
        email,
        first_name: first_name ?? null,
        last_name: last_name ?? null,
        company: company ?? null,
        phone: phone ?? null,
        list_id: list_id ?? null,
        status: status ?? "active",
      })
      .select("id, email, first_name, last_name, company, phone, status, list_id, created_at")
      .single();

    if (error) return errorResult(`Could not create contact: ${error.message}`);
    return jsonResult({ contact: data });
  },
});
