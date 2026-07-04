// MCP tool: list the tenant's provider connections and synced audiences.
// NEVER expose encrypted_credentials — only safe status metadata is returned.
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authenticateTenant } from "../tenant-auth";
import { errorResult, jsonResult } from "../respond";

const apiKey = z
  .string()
  .min(1)
  .describe("Your MusicDibs tenant API key (mdb_live_…), from Settings → Developers.");

export default defineTool({
  name: "list_providers",
  title: "List providers",
  description:
    "List the tenant's connected delivery/CRM providers (e.g. MailerLite, Brevo, Resend, Salesforce) with connection status and last sync, plus any synced provider audiences. Credentials are never returned.",
  inputSchema: { api_key: apiKey },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ api_key }) => {
    const auth = await authenticateTenant(api_key);
    if (!auth.ok) return errorResult(auth.message);
    const { supabase, tenantId } = auth.ctx;

    const [connectionsRes, audiencesRes] = await Promise.all([
      supabase
        .from("provider_connections")
        .select("id, provider_type, status, last_sync_at, created_at, updated_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
      supabase
        .from("provider_audiences")
        .select("id, provider_connection_id, external_id, name, audience_type, contacts_count, last_sync_at")
        .eq("tenant_id", tenantId),
    ]);

    const firstError = connectionsRes.error || audiencesRes.error;
    if (firstError) return errorResult(`Could not list providers: ${firstError.message}`);

    return jsonResult({
      providers: connectionsRes.data ?? [],
      audiences: audiencesRes.data ?? [],
    });
  },
});
