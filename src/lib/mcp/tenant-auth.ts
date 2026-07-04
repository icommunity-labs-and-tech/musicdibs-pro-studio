// Shared tenant authentication for the MCP tools that expose PRIVATE per-tenant
// data. This project uses an external Supabase project for which the OAuth 2.1
// authorization server (with dynamic client registration) required by a standard
// MCP connector is NOT provisionable through Lovable tooling. Instead we reuse
// the app's own tenant API keys (mdb_live_...): the caller passes the key as a
// tool argument, we validate its SHA-256 hash against `tenant_api_keys`, resolve
// the tenant, and run every query with the service-role client SCOPED to that
// tenant_id.
//
// Import-safe: no env reads or I/O at module scope. Everything runs inside
// authenticateTenant(), where the request env is available.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type TenantContext = {
  tenantId: string;
  supabase: SupabaseClient<Database>;
};

export type TenantAuthResult =
  | { ok: true; ctx: TenantContext }
  | { ok: false; message: string };

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validate a tenant API key and return a service-role client plus the resolved
 * tenant id. NEVER return or log the raw key. Callers MUST scope every query by
 * `ctx.tenantId`.
 */
export async function authenticateTenant(apiKey: string): Promise<TenantAuthResult> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { ok: false, message: "Supabase runtime configuration is missing." };
  }

  const key = apiKey.trim();
  if (!key.startsWith("mdb_live_")) {
    return { ok: false, message: "Invalid API key format (expected an mdb_live_… key)." };
  }

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const keyHash = await sha256Hex(key);
  const { data, error } = await supabase
    .from("tenant_api_keys")
    .select("id, tenant_id, revoked_at")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) return { ok: false, message: `Authentication error: ${error.message}` };
  if (!data) return { ok: false, message: "API key not recognized or revoked." };

  // Best-effort usage tracking; ignore failures.
  await supabase
    .from("tenant_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { ok: true, ctx: { tenantId: data.tenant_id, supabase } };
}
