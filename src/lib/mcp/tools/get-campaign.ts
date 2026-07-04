// MCP tool: fetch a single campaign with its stats and experiences.
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authenticateTenant } from "../tenant-auth";
import { errorResult, jsonResult } from "../respond";

const apiKey = z
  .string()
  .min(1)
  .describe("Your MusicDibs tenant API key (mdb_live_…), from Settings → Developers.");

export default defineTool({
  name: "get_campaign",
  title: "Get campaign",
  description:
    "Fetch one campaign of the tenant by id, including delivery stats (emails sent/opened/clicked, unsubscribes, actual cost) and any published experiences with their play counts.",
  inputSchema: {
    api_key: apiKey,
    campaign_id: z.string().uuid().describe("The campaign id (uuid)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ api_key, campaign_id }) => {
    const auth = await authenticateTenant(api_key);
    if (!auth.ok) return errorResult(auth.message);
    const { supabase, tenantId } = auth.ctx;

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", campaign_id)
      .maybeSingle();

    if (error) return errorResult(`Could not load campaign: ${error.message}`);
    if (!campaign) return errorResult("Campaign not found for this tenant.");

    const [statsRes, experiencesRes] = await Promise.all([
      supabase
        .from("campaign_stats")
        .select("emails_sent, emails_opened, emails_clicked, unsubscribes, cost_actual, updated_at")
        .eq("tenant_id", tenantId)
        .eq("campaign_id", campaign_id)
        .maybeSingle(),
      supabase
        .from("experience_pages")
        .select(
          "id, experience_token, title, status, play_count, unique_visitors, completion_count, download_count, cta_click_count",
        )
        .eq("tenant_id", tenantId)
        .eq("campaign_id", campaign_id),
    ]);

    return jsonResult({
      campaign,
      stats: statsRes.data ?? null,
      experiences: experiencesRes.data ?? [],
    });
  },
});
