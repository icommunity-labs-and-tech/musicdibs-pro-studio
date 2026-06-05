// ============================================================================
// PLACEHOLDER server-side credential encryption — ISOLATED ON PURPOSE.
//
// This module is the single point where provider credentials are encrypted
// before storage and decrypted when needed for outbound API calls. It is
// intentionally isolated so it can be replaced with a real KMS / AES-GCM
// implementation WITHOUT touching the rest of the edge function.
//
// Current behaviour: reversible obfuscation (base64) with a versioned envelope.
// This is NOT real encryption. Do NOT treat stored values as secure until a
// real implementation lands. A future task will swap the body of these two
// functions for authenticated encryption (e.g. AES-256-GCM with a key from
// Deno.env / a managed KMS).
// ============================================================================

const ENVELOPE_VERSION = "v0-placeholder";

export interface EncryptedEnvelope {
  v: string;
  data: string;
}

/** Encrypt a plaintext credentials object before it touches the database. */
export function encryptCredentials(plaintext: Record<string, unknown>): EncryptedEnvelope {
  const json = JSON.stringify(plaintext);
  const data = btoa(unescape(encodeURIComponent(json)));
  return { v: ENVELOPE_VERSION, data };
}

/** Decrypt a stored envelope back into the credentials object. Server-only. */
export function decryptCredentials(envelope: unknown): Record<string, unknown> | null {
  if (
    !envelope ||
    typeof envelope !== "object" ||
    !("data" in envelope) ||
    typeof (envelope as EncryptedEnvelope).data !== "string"
  ) {
    return null;
  }
  try {
    const json = decodeURIComponent(escape(atob((envelope as EncryptedEnvelope).data)));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
