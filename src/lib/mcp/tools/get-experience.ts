// MCP tool: look up a published MusicDibs music experience by its public token.
// Uses the same anonymous, SECURITY DEFINER `get_experience` RPC that powers the
// public /play/{token} page, so no private/tenant data is ever exposed.
import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export default defineTool({
  name: "get_experience",
  title: "Get music experience",
  description:
    "Fetch a published MusicDibs music experience by its public share token (the token in a /play/{token} link). Returns the public title, message, audio URL, call-to-action and playback stats. Only works for experiences the tenant has published.",
  inputSchema: {
    token: z
      .string()
      .min(1)
      .describe("The public experience token, e.g. the value in /play/{token}."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ token }) => {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !anonKey) {
      return {
        content: [{ type: "text", text: "Supabase runtime configuration is missing." }],
        isError: true,
      };
    }

    const supabase = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.rpc("get_experience", {
      p_token: token.trim(),
    });

    if (error) {
      return {
        content: [{ type: "text", text: `Could not load experience: ${error.message}` }],
        isError: true,
      };
    }

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "No published experience found for that token.",
          },
        ],
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { experience: data as Record<string, unknown> },
    };
  },
});
