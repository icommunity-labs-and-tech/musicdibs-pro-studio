// MailerLite connector — CLIENT-SIDE STUB.
//
// The REAL MailerLite API integration runs server-side in the edge function
// `supabase/functions/manage-provider-connection` (see MailerLiteConnector.ts
// there). For security, the API key never leaves the server, so no real
// MailerLite calls happen in the browser. This class stays as a typed stub to
// satisfy the Provider Framework contract on the client.

import {
  BaseProviderConnector,
  type ConnectResult,
  type ProviderAudience,
  type ProviderCredentials,
  type ProviderStats,
  type ProviderType,
  type ValidationResult,
} from "./ProviderConnector";

export class MailerLiteConnector extends BaseProviderConnector {
  readonly type: ProviderType = "mailerlite";

  async connect(_credentials: ProviderCredentials): Promise<ConnectResult> {
    // TODO: validate against MailerLite API. Mocked for now.
    return { status: "connected" };
  }

  async disconnect(): Promise<void> {
    // TODO: revoke / clean up at MailerLite. No-op for now.
  }

  async validateCredentials(
    credentials: ProviderCredentials,
  ): Promise<ValidationResult> {
    // TODO: call MailerLite. For now accept any non-empty key.
    return { valid: credentials.apiKey.trim().length > 0 };
  }

  async syncAudiences(): Promise<ProviderAudience[]> {
    // TODO: fetch lists / segments / automations from MailerLite. Mocked: none.
    return [];
  }

  async getAudienceSize(_externalId: string): Promise<number> {
    // TODO: fetch real size from MailerLite. Mocked.
    return 0;
  }

  async syncStats(): Promise<ProviderStats> {
    // TODO: fetch real stats from MailerLite. Mocked.
    return { audiencesCount: 0, totalContacts: 0, lastSyncAt: null };
  }
}
