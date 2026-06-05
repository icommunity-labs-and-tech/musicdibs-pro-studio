// ============================================================================
// AI Music Studio — shared edge utilities (Deno).
// CORS, JSON responses, structured logging, callback-token signing and the
// "copy provider media into Supabase Storage" workflow.
// ============================================================================

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Structured logging (never logs secrets) ─────────────────────────────────
export function log(
  scope: string,
  event: string,
  fields: Record<string, unknown> = {},
): void {
  try {
    console.log(JSON.stringify({ scope, event, ts: new Date().toISOString(), ...fields }));
  } catch {
    console.log(`[${scope}] ${event}`);
  }
}

// ── Callback token (HMAC over jobId + stage, keyed by service role) ──────────
// Lets the public callback endpoints validate that a request really maps to a
// job we created, without exposing any secret in the callback URL.
async function hmacHex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signCallback(
  jobId: string,
  stage: "lyrics" | "music",
): Promise<string> {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return hmacHex(key, `${jobId}:${stage}`);
}

export async function verifyCallback(
  jobId: string,
  stage: "lyrics" | "music",
  token: string | null,
): Promise<boolean> {
  if (!jobId || !token) return false;
  const expected = await signCallback(jobId, stage);
  if (expected.length !== token.length) return false;
  // Constant-time-ish comparison.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

export function callbackUrl(
  fn: string,
  jobId: string,
  token: string,
): string {
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
  return `${base}/functions/v1/${fn}?job=${encodeURIComponent(jobId)}&token=${token}`;
}

// ── Copy provider media into Supabase Storage ───────────────────────────────
// We never rely on provider URLs. Returns the storage path + public URL.
const STORAGE_BUCKET = "campaign-audio";

export interface StoredFile {
  storagePath: string;
  publicUrl: string;
}

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export async function downloadAndStore(
  supabase: SupabaseLike,
  sourceUrl: string,
  storagePath: string,
  contentType: string,
): Promise<StoredFile> {
  log("storage", "download_start", { storagePath });
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Failed to download asset (HTTP ${res.status})`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  log("storage", "upload_done", { storagePath, bytes: bytes.length });
  return { storagePath, publicUrl: data.publicUrl as string };
}
