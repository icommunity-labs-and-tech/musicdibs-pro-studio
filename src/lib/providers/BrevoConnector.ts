// Brevo connector — PLACEHOLDER ONLY.
// No real Brevo API calls yet. Every method returns mocked values so the
// Provider Framework UI and persistence layer can be built and tested first.

import {
  BaseProviderConnector,
  type ConnectResult,
  type ProviderAudience,
  type ProviderCredentials,
  type ProviderStats,
  type ProviderType,
  type ValidationResult,
} from "./ProviderConnector";

export class BrevoConnector extends BaseProviderConnector {
  readonly type: ProviderType = "brevo";

  async connect(_credentials: ProviderCredentials): Promise<ConnectResult> {
    // TODO: validate against Brevo API. Mocked for now.
    return { status: "connected" };
  }

  async disconnect(): Promise<void> {
    // TODO: revoke / clean up at Brevo. No-op for now.
  }

  async validateCredentials(
    credentials: ProviderCredentials,
  ): Promise<ValidationResult> {
    // TODO: call Brevo. For now accept any non-empty key.
    return { valid: credentials.apiKey.trim().length > 0 };
  }

  async syncAudiences(): Promise<ProviderAudience[]> {
    // TODO: fetch lists / segments / automations from Brevo. Mocked: none.
    return [];
  }

  async getAudienceSize(_externalId: string): Promise<number> {
    // TODO: fetch real size from Brevo. Mocked.
    return 0;
  }

  async syncStats(): Promise<ProviderStats> {
    // TODO: fetch real stats from Brevo. Mocked.
    return { audiencesCount: 0, totalContacts: 0, lastSyncAt: null };
  }
}
