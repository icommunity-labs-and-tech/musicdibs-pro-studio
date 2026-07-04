import { defineMcp } from "@lovable.dev/mcp-js";

// Public tool (anonymous, no auth) — reads only already-public data.
import getExperienceTool from "./tools/get-experience";

// Tenant tools — authenticated with the app's own tenant API key (mdb_live_…)
// passed as a tool argument, validated against `tenant_api_keys`. See
// ./tenant-auth.ts for why API-key auth is used instead of MCP OAuth here.
import getAccountTool from "./tools/get-account";
import getDashboardTool from "./tools/get-dashboard";
import listCampaignsTool from "./tools/list-campaigns";
import getCampaignTool from "./tools/get-campaign";
import listContactListsTool from "./tools/list-contact-lists";
import listContactsTool from "./tools/list-contacts";
import listExperiencesTool from "./tools/list-experiences";
import listProvidersTool from "./tools/list-providers";
import createContactListTool from "./tools/create-contact-list";
import createContactTool from "./tools/create-contact";
import updateContactTool from "./tools/update-contact";
import deleteContactTool from "./tools/delete-contact";
import createCampaignTool from "./tools/create-campaign";
import updateCampaignTool from "./tools/update-campaign";

// MusicDibs MCP server — exposes the app to AI assistants (ChatGPT / Claude).
//
// Auth model: the server itself ships without OAuth (`auth: none`). The single
// public tool (`get_experience`) reads only already-public data. Every other
// tool requires a tenant API key passed as the `api_key` argument; that key is
// hashed and matched against `tenant_api_keys`, and all queries are scoped to
// the resolved tenant. This project uses an external Supabase project for which
// the OAuth 2.1 authorization server + dynamic client registration required by
// a standard OAuth MCP connector cannot be provisioned through Lovable tooling.
//
// Keep this module import-safe: no env reads, I/O, or throwing at top level.
export default defineMcp({
  name: "musicdibs-mcp",
  title: "MusicDibs MCP",
  version: "0.2.0",
  instructions:
    "Tools for MusicDibs, an AI music experience layer. `get_experience` is public (needs only a /play share token). All other tools operate on private tenant data and require an `api_key` argument — the tenant API key (mdb_live_…) found in the app under Settings → Developers. Ask the user for their API key once and reuse it for every call. Read tools: get_account, get_dashboard, list_campaigns, get_campaign, list_contacts, list_contact_lists, list_experiences, list_providers. Write tools: create_contact, update_contact, delete_contact, create_contact_list, create_campaign, update_campaign.",
  tools: [
    getExperienceTool,
    getAccountTool,
    getDashboardTool,
    listCampaignsTool,
    getCampaignTool,
    listContactListsTool,
    listContactsTool,
    listExperiencesTool,
    listProvidersTool,
    createContactListTool,
    createContactTool,
    updateContactTool,
    deleteContactTool,
    createCampaignTool,
    updateCampaignTool,
  ],
});
