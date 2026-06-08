// ============================================================================
// start-personalized-campaign
//
// Kicks off an N-to-N personalized campaign:
//   1. Fetches contacts from the active provider audience (MailerLite/Resend)
//   2. Creates one generation_job per contact with a personalized lyrics prompt
//   3. Stores a personalized_deliveries row for each contact → job mapping
//   4. Fires startLyricsForJob for every job concurrently (async KIE pipeline)
//
// After this EF returns, the KIE callbacks drive the rest:
//   ai-music-studio-lyrics-callback → ai-music-studio-music-callback
// The music callback auto-approves each asset, creates an experience_page,
// and marks the delivery as 'ready'. When all jobs complete it marks the
// campaign as 'ready_to_send'.
//
// MVP limits:
//   - max 50 contacts per run (contact_limit param, default 50)
//   - personalisation: {first_name} placeholder in lyrics_goal
//   - supported providers: mailerlite, resend
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json, log } from "../_shared/ai-studio.ts";
import { KieError } from "../_shared/kie-errors.ts";
import { loadConfig, startLyricsForJob } from "../_shared/orchestrator.ts";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT     = 200;

// ── Credential decryption ──────────────────────────────────────────────────
function decryptCredentials(envelope: unknown): Record<string, unknown> | null {
  try {
    if (!envelope || typeof (envelope as Record<string, unknown>).data !== "string") return null;
    const raw = atob((envelope as { data: string }).data);
    const decoded = decodeURIComponent(escape(raw));
    return JSON.parse(decoded);
  } catch { return null; }
}

// ── Contact type ────────────────────────────────────────────────────────────
interface Contact {
  externalId: string;
  firstName:  string;
}

// ── Provider: MailerLite ────────────────────────────────────────────────────
async function fetchMailerLiteContacts(
  apiKey: string,
  groupExternalId: string,
  limit: number,
): Promise<Contact[]> {
  const url = `https://connect.mailerlite.com/api/groups/${encodeURIComponent(groupExternalId)}/subscribers?limit=${limit}&filter[status]=active`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`MailerLite API error ${res.status}: ${txt.slice(0, 200)}`);
  }
  const body = await res.json();
  const rows: Record<string, unknown>[] = Array.isArray(body?.data) ? body.data : [];
  return rows.map((r) => ({
    externalId: String(r.id ?? ""),
    firstName:  String((r.fields as Record<string, unknown>)?.name ?? "").trim() || "amigo",
  })).filter((c) => c.externalId);
}

// ── Provider: Resend ────────────────────────────────────────────────────────
async function fetchResendContacts(
  apiKey: string,
  audienceExternalId: string,
  limit: number,
): Promise<Contact[]> {
  const url = `https://api.resend.com/audiences/${encodeURIComponent(audienceExternalId)}/contacts`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Resend API error ${res.status}: ${txt.slice(0, 200)}`);
  }
  const body = await res.json();
  const rows: Record<string, unknown>[] = Array.isArray(body?.data) ? body.data : [];
  return rows.slice(0, limit).map((r) => ({
    externalId: String(r.id ?? ""),
    firstName:  String(r.first_name ?? "").trim() || "amigo",
  })).filter((c) => c.externalId);
}

// ── Personalise the lyricsGoal with first_name ─────────────────────────────
function personalizeGoal(template: string | null, firstName: string): string {
  const base = template ?? "Crea una canción especial";
  if (base.includes("{first_name}")) {
    return base.replace(/\{first_name\}/g, firstName);
  }
  return `${base} para ${firstName}`;
}

// ── Main handler ────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile?.tenant_id) return json({ error: "Profile not found" }, 404);
    const tenantId = profile.tenant_id as string;

    // Body
    const body = await req.json().catch(() => ({}));
    const campaignId   = body.campaign_id as string | undefined;
    const audienceId   = body.audience_id as string | undefined;
    const contactLimit = Math.min(Number(body.contact_limit ?? DEFAULT_LIMIT), MAX_LIMIT);

    if (!campaignId) return json({ error: "campaign_id requerido" }, 400);
    if (!audienceId) return json({ error: "audience_id requerido" }, 400);

    // Load campaign (tenant-scoped)
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, tenant_id, status, campaign_type, name")
      .eq("id", campaignId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!campaign) return json({ error: "Campaña no encontrada" }, 404);

    // Mark as personalized if needed
    if (campaign.campaign_type !== "personalized") {
      await supabase.from("campaigns")
        .update({ campaign_type: "personalized", updated_at: new Date().toISOString() })
        .eq("id", campaignId);
    }

    // Load generation config
    const config = await loadConfig(supabase, campaignId);

    // Load provider audience
    const { data: audience } = await supabase
      .from("provider_audiences")
      .select("id, external_id, name, provider_connection_id")
      .eq("id", audienceId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!audience) return json({ error: "Audiencia no encontrada" }, 404);

    // Load provider connection + decrypt API key
    const { data: conn } = await supabase
      .from("provider_connections")
      .select("provider_type, encrypted_credentials, status")
      .eq("id", audience.provider_connection_id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!conn || conn.status !== "connected") {
      return json({ error: "Proveedor no conectado" }, 400);
    }

    const creds = decryptCredentials(conn.encrypted_credentials);
    const apiKey = typeof creds?.apiKey === "string" ? creds.apiKey : "";
    if (!apiKey) return json({ error: "API key del proveedor no configurada" }, 400);

    // Fetch contacts from provider
    log("personalized", "fetch_contacts", { tenantId, campaignId, provider: conn.provider_type, audienceExternalId: audience.external_id });

    let contacts: Contact[];
    if (conn.provider_type === "mailerlite") {
      contacts = await fetchMailerLiteContacts(apiKey, audience.external_id, contactLimit);
    } else if (conn.provider_type === "resend") {
      contacts = await fetchResendContacts(apiKey, audience.external_id, contactLimit);
    } else {
      return json({ error: `Proveedor '${conn.provider_type}' no soportado para campañas personalizadas` }, 400);
    }

    if (contacts.length === 0) {
      return json({ error: "No se encontraron contactos activos en esta audiencia" }, 400);
    }

    log("personalized", "contacts_fetched", { count: contacts.length, campaignId });

    // Create generation_batch
    const { data: batch, error: batchErr } = await supabase
      .from("generation_batches")
      .insert({
        tenant_id:       tenantId,
        campaign_id:     campaignId,
        status:          "processing",
        generation_mode: "personalized",
        generation_round: 1,
        total_jobs:      contacts.length,
        started_at:      new Date().toISOString(),
      })
      .select("*")
      .single();
    if (batchErr) throw batchErr;

    // Create N jobs + N personalized_deliveries
    const jobInserts = contacts.map(() => ({
      tenant_id:           tenantId,
      campaign_id:         campaignId,
      generation_batch_id: batch.id,
      status:              "processing",
      provider:            "ai-music-studio",
      generation_round:    1,
      lyrics_status:       "pending",
      music_status:        "pending",
    }));

    const { data: jobs, error: jobsErr } = await supabase
      .from("generation_jobs")
      .insert(jobInserts)
      .select("id");
    if (jobsErr) throw jobsErr;

    // Deliveries (contact ↔ job mapping)
    const deliveryInserts = contacts.map((c, i) => ({
      campaign_id:         campaignId,
      tenant_id:           tenantId,
      generation_batch_id: batch.id,
      generation_job_id:   jobs![i].id,
      external_contact_id: c.externalId,
      first_name:          c.firstName,
      status:              "generating",
    }));

    const { error: delErr } = await supabase
      .from("personalized_deliveries")
      .insert(deliveryInserts);
    if (delErr) throw delErr;

    // Update campaign status
    await supabase.from("campaigns")
      .update({ status: "generating", updated_at: new Date().toISOString() })
      .eq("id", campaignId);

    // Fire startLyricsForJob for each job concurrently
    log("personalized", "dispatching_lyrics", { count: contacts.length, batchId: batch.id });

    const dispatchResults = await Promise.allSettled(
      contacts.map((contact, i) => {
        const personalizedConfig = {
          ...config,
          lyricsGoal: personalizeGoal(config.lyricsGoal, contact.firstName),
        };
        return startLyricsForJob(supabase, jobs![i], personalizedConfig);
      }),
    );

    const dispatched = dispatchResults.filter((r) => r.status === "fulfilled").length;
    const failed     = dispatchResults.filter((r) => r.status === "rejected").length;

    if (failed > 0) {
      const errors = dispatchResults
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => r.reason?.message ?? String(r.reason))
        .slice(0, 3);
      log("personalized", "partial_failure", { dispatched, failed, errors });
    }

    log("personalized", "complete", { batchId: batch.id, total: contacts.length, dispatched, failed });

    return json({
      ok:         true,
      batch_id:   batch.id,
      total_jobs: contacts.length,
      dispatched,
      failed,
    });

  } catch (err) {
    if (err instanceof KieError) {
      log("personalized", "kie_error", { code: err.code, rawMessage: err.rawMessage });
      return json({ error: err.message }, 500);
    }
    log("personalized", "error", { message: err instanceof Error ? err.message : "unknown" });
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
