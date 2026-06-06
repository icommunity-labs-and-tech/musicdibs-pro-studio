// ============================================================================
// PLACEHOLDER server-side credential encryption — ISOLATED ON PURPOSE.
//
// Mirror of manage-provider-connection/encryption.ts. Kept per-function because
// Supabase bundles each edge function independently. This is the single point
// where provider credentials are encrypted/decrypted; swap the body for real
// authenticated encryption (AES-256-GCM + KMS) without touching callers.
//
// Current behaviour: reversible obfuscation (base64) with a versioned envelope.
// This is NOT real encryption.
// ============================================================================

const ENVELOPE_VERSION = "v0-placeholder";

export interface EncryptedEnvelope {
  v: string;
  data: string;
}

/** Decrypt a stored envelope back into the credentials object. Server-only. */
export function decryptCredentials(
  envelope: unknown,
): Record<string, unknown> | null {
  if (
    !envelope ||
    typeof envelope !== "object" ||
    !("data" in envelope) ||
    typeof (envelope as EncryptedEnvelope).data !== "string"
  ) {
    return null;
  }
  try {
    const json = decodeURIComponent(
      escape(atob((envelope as EncryptedEnvelope).data)),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
