// MCP tool: list the tenant's contacts, with optional filters.
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authenticateTenant } from "../tenant-auth";
import { errorResult, jsonResult } from "../respond";

const apiKey = z
  .string()
  .min(1)
  .describe("Your MusicDibs tenant API key (mdb_live_…), from Settings → Developers.");

export default defineTool({
  name: "list_contacts",
  title: "List contacts",
  description:
    "List the tenant's contacts, most recent first. Optionally filter by contact list, status, or an email search term. Supports pagination via limit/offset.",
  inputSchema: {
    api_key: apiKey,
    list_id: z.string().uuid().optional().describe("Optional contact list id to filter by."),
    status: z
      .enum(["active", "unsubscribed", "bounced", "cleaned"])
      .optional()
      .describe("Optional contact status filter."),
    search: z.string().optional().describe("Optional case-insensitive email search."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
    offset: z.number().int().min(0).optional().describe("Rows to skip (default 0)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ api_key, list_id, status, search, limit, offset }) => {
    const auth = await authenticateTenant(api_key);
    if (!auth.ok) return errorResult(auth.message);
    const { supabase, tenantId } = auth.ctx;

    const take = limit ?? 50;
    const skip = offset ?? 0;

    let query = supabase
      .from("contacts")
      .select(
        "id, email, first_name, last_name, company, phone, status, list_id, created_at",
        { count: "exact" },
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(skip, skip + take - 1);

    if (list_id) query = query.eq("list_id", list_id);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("email", `%${search}%`);

    const { data, error, count } = await query;
    if (error) return errorResult(`Could not list contacts: ${error.message}`);
    return jsonResult({ contacts: data ?? [], total: count ?? 0, limit: take, offset: skip });
  },
});
