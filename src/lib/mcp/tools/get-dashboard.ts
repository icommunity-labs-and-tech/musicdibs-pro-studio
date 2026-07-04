// MCP tool: high-level dashboard metrics for the authenticated tenant.
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authenticateTenant } from "../tenant-auth";
import { errorResult, jsonResult } from "../respond";

const apiKey = z
  .string()
  .min(1)
  .describe("Your MusicDibs tenant API key (mdb_live_…), from Settings → Developers.");

export default defineTool({
  name: "get_dashboard",
  title: "Get dashboard metrics",
  description:
    "Return aggregate metrics for the tenant: totals for campaigns (with a status breakdown), contacts, contact lists, published experiences, and total plays/completions across all experiences.",
  inputSchema: { api_key: apiKey },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ api_key }) => {
    const auth = await authenticateTenant(api_key);
    if (!auth.ok) return errorResult(auth.message);
    const { supabase, tenantId } = auth.ctx;

    const [campaignsRes, contactsRes, listsRes, experiencesRes] = await Promise.all([
      supabase.from("campaigns").select("status").eq("tenant_id", tenantId),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabase.from("contact_lists").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabase
        .from("experience_pages")
        .select("status, play_count, completion_count")
        .eq("tenant_id", tenantId),
    ]);

    const firstError =
      campaignsRes.error || contactsRes.error || listsRes.error || experiencesRes.error;
    if (firstError) return errorResult(`Could not load metrics: ${firstError.message}`);

    const campaignsByStatus: Record<string, number> = {};
    for (const row of campaignsRes.data ?? []) {
      campaignsByStatus[row.status] = (campaignsByStatus[row.status] ?? 0) + 1;
    }

    const experiences = experiencesRes.data ?? [];
    const totalPlays = experiences.reduce((sum, e) => sum + (e.play_count ?? 0), 0);
    const totalCompletions = experiences.reduce((sum, e) => sum + (e.completion_count ?? 0), 0);

    return jsonResult({
      campaigns_total: campaignsRes.data?.length ?? 0,
      campaigns_by_status: campaignsByStatus,
      contacts_total: contactsRes.count ?? 0,
      contact_lists_total: listsRes.count ?? 0,
      experiences_total: experiences.length,
      total_plays: totalPlays,
      total_completions: totalCompletions,
    });
  },
});
