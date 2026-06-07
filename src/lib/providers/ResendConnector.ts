// Resend connector — CLIENT-SIDE STUB.
//
// The REAL Resend API integration runs server-side in the edge function
// `supabase/functions/manage-provider-connection` (see ResendConnector.ts
// there). For security, the API key never leaves the server, so no real Resend
// calls happen in the browser. This class stays as a typed stub to satisfy the
// Provider Framework contract on the client.

import {
  BaseProviderConnector,
  type ConnectResult,
  type ProviderAudience,
  type ProviderCredentials,
  type ProviderStats,
  type ProviderType,
  type ValidationResult,
} from "./ProviderConnector";

export class ResendConnector extends BaseProviderConnector {
  readonly type: ProviderType = "resend";

  async connect(_credentials: ProviderCredentials): Promise<ConnectResult> {
    return { status: "connected" };
  }

  async disconnect(): Promise<void> {
    // No-op on the client. Real cleanup happens server-side.
  }

  async validateCredentials(
    credentials: ProviderCredentials,
  ): Promise<ValidationResult> {
    return { valid: credentials.apiKey.trim().length > 0 };
  }

  async syncAudiences(): Promise<ProviderAudience[]> {
    // Real Resend "Audiences" are synced server-side. Mocked here.
    return [];
  }

  async getAudienceSize(_externalId: string): Promise<number> {
    return 0;
  }

  async syncStats(): Promise<ProviderStats> {
    return { audiencesCount: 0, totalContacts: 0, lastSyncAt: null };
  }
}
