// Shared error type for manage-provider-campaign actions so the UI can react to
// specific backend error codes (e.g. `sender_missing`) instead of only showing
// a generic message.

export class ProviderCampaignError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "ProviderCampaignError";
    this.code = code;
  }
}

/** True when the backend signalled a missing/unconfigured sender. */
export function isSenderMissing(error: unknown): boolean {
  return error instanceof ProviderCampaignError && error.code === "sender_missing";
}

/**
 * Build a ProviderCampaignError from a supabase.functions.invoke result,
 * extracting both the `error` message and the `code` from the JSON body.
 */
export function toProviderCampaignError(
  error: { message: string; context?: { body?: unknown } } | null,
  data: Record<string, unknown> | null | undefined,
): ProviderCampaignError | null {
  if (error) {
    let message = error.message;
    let code: string | undefined;
    try {
      const ctx = error.context;
      const parsed =
        typeof ctx?.body === "string" ? JSON.parse(ctx.body) : ctx?.body;
      if (parsed && typeof parsed === "object") {
        if ("error" in parsed) message = String((parsed as { error: unknown }).error);
        if ("code" in parsed) code = String((parsed as { code: unknown }).code);
      }
    } catch {
      /* keep original message */
    }
    return new ProviderCampaignError(message, code);
  }
  if (data?.error) {
    const code = "code" in data ? String((data as { code: unknown }).code) : undefined;
    return new ProviderCampaignError(String(data.error), code);
  }
  return null;
}
