// Per-request Supabase client bound to the MCP caller's verified access token.
// RLS runs as that user (and their tenant), so every query is automatically
// scoped. Env is read INSIDE the function — never at module import time.
import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

export function supabaseForUser(ctx: ToolContext) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase runtime configuration is missing");
  }
  return createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
