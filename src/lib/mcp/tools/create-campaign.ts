// MCP tool: create a draft campaign for the tenant.
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authenticateTenant } from "../tenant-auth";
import { errorResult, jsonResult } from "../respond";

const apiKey = z
  .string()
  .min(1)
  .describe("Your MusicDibs tenant API key (mdb_live_…), from Settings → Developers.");

export default defineTool({
  name: "create_campaign",
  title: "Create campaign",
  description:
    "Create a new draft campaign for the tenant. Only a name is required; sensible defaults are applied for the rest. The campaign is created in 'draft' status.",
  inputSchema: {
    api_key: apiKey,
    name: z.string().trim().min(1).max(160).describe("Campaign name."),
    type: z
      .enum(["single_song", "personalized_song"])
      .optional()
      .describe("Song type (default single_song)."),
    campaign_type: z
      .enum(["broadcast", "personalized"])
      .optional()
      .describe("Campaign type (default broadcast)."),
    vertical: z.string().trim().max(60).optional().describe("Industry vertical (default music_label)."),
    goal: z.string().trim().max(500).optional().describe("Campaign goal / objective."),
    tone: z.string().trim().max(120).optional().describe("Desired tone for the song."),
    music_style: z.string().trim().max(120).optional().describe("Music style."),
    language: z.string().trim().max(10).optional().describe("Language code (default es)."),
    delivery_channel: z
      .enum(["email", "whatsapp"])
      .optional()
      .describe("Delivery channel (default email)."),
    duration_seconds: z.number().int().min(10).max(240).optional().describe("Song length (default 30)."),
    ai_prompt: z.string().trim().max(2000).optional().describe("Optional AI prompt for generation."),
    subject: z.string().trim().max(300).optional().describe("Email subject (email campaigns)."),
    contact_list_id: z.string().uuid().optional().describe("Optional contact list to target."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ api_key, contact_list_id, ...fields }) => {
    const auth = await authenticateTenant(api_key);
    if (!auth.ok) return errorResult(auth.message);
    const { supabase, tenantId } = auth.ctx;

    if (contact_list_id) {
      const { data: list } = await supabase
        .from("contact_lists")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("id", contact_list_id)
        .maybeSingle();
      if (!list) return errorResult("The given contact_list_id does not belong to this tenant.");
    }

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        tenant_id: tenantId,
        name: fields.name,
        type: fields.type ?? "single_song",
        campaign_type: fields.campaign_type ?? "broadcast",
        vertical: fields.vertical ?? "music_label",
        goal: fields.goal ?? null,
        tone: fields.tone ?? null,
        music_style: fields.music_style ?? null,
        language: fields.language ?? "es",
        delivery_channel: fields.delivery_channel ?? "email",
        duration_seconds: fields.duration_seconds ?? 30,
        ai_prompt: fields.ai_prompt ?? null,
        subject: fields.subject ?? null,
        contact_list_id: contact_list_id ?? null,
        status: "draft",
      })
      .select("id, name, type, campaign_type, vertical, status, delivery_channel, created_at")
      .single();

    if (error) return errorResult(`Could not create campaign: ${error.message}`);
    return jsonResult({ campaign: data });
  },
});
