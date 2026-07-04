// MCP tool: update an existing campaign for the tenant.
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { authenticateTenant } from "../tenant-auth";
import { errorResult, jsonResult } from "../respond";

type CampaignUpdate = Database["public"]["Tables"]["campaigns"]["Update"];

const apiKey = z
  .string()
  .min(1)
  .describe("Your MusicDibs tenant API key (mdb_live_…), from Settings → Developers.");

export default defineTool({
  name: "update_campaign",
  title: "Update campaign",
  description:
    "Update editable fields of an existing campaign belonging to the tenant. Only provided fields are changed.",
  inputSchema: {
    api_key: apiKey,
    campaign_id: z.string().uuid().describe("The campaign id (uuid)."),
    name: z.string().trim().min(1).max(160).optional(),
    status: z.string().trim().max(40).optional().describe("New status, e.g. draft, queued."),
    goal: z.string().trim().max(500).optional(),
    tone: z.string().trim().max(120).optional(),
    music_style: z.string().trim().max(120).optional(),
    ai_prompt: z.string().trim().max(2000).optional(),
    subject: z.string().trim().max(300).optional(),
    delivery_channel: z.enum(["email", "whatsapp"]).optional(),
    contact_list_id: z.string().uuid().nullable().optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ api_key, campaign_id, ...fields }) => {
    const auth = await authenticateTenant(api_key);
    if (!auth.ok) return errorResult(auth.message);
    const { supabase, tenantId } = auth.ctx;

    const updates: CampaignUpdate = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) (updates as Record<string, unknown>)[key] = value;
    }
    if (Object.keys(updates).length === 0) {
      return errorResult("No fields provided to update.");
    }

    if (fields.contact_list_id) {
      const { data: list } = await supabase
        .from("contact_lists")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("id", fields.contact_list_id)
        .maybeSingle();
      if (!list) return errorResult("The given contact_list_id does not belong to this tenant.");
    }

    const { data, error } = await supabase
      .from("campaigns")
      .update(updates)
      .eq("tenant_id", tenantId)
      .eq("id", campaign_id)
      .select("id, name, type, campaign_type, vertical, status, delivery_channel, updated_at")
      .maybeSingle();

    if (error) return errorResult(`Could not update campaign: ${error.message}`);
    if (!data) return errorResult("Campaign not found for this tenant.");
    return jsonResult({ campaign: data });
  },
});
