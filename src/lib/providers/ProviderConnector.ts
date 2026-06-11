// Provider Framework — base contract for external marketing platforms.
//
// IMPORTANT: MusicDibs is NOT an email marketing platform. The source of truth
// for contacts, lists, segments, automations and campaigns ALWAYS stays in the
// customer's marketing platform. Connectors only read metadata — never the full
// contact database.
//
// This file defines the shared types and the ProviderConnector interface that
// every concrete connector (MailerLite, Brevo, …) must implement. No real API
// calls live here yet; concrete connectors return mocked values for now.

export type ProviderType = "mailerlite" | "brevo" | "resend" | "twilio" | "whatsapp";

export type ProviderStatus = "disconnected" | "connected" | "error";

export type AudienceType = "list" | "segment" | "automation";

/** Credentials supplied by the tenant when connecting a provider. */
export interface ProviderCredentials {
  apiKey: string;
}

/** Metadata-only representation of an external audience. */
export interface ProviderAudience {
  externalId: string;
  name: string;
  audienceType: AudienceType;
  contactsCount: number;
}

/** Aggregated stats pulled back from the provider for reporting. */
export interface ProviderStats {
  audiencesCount: number;
  totalContacts: number;
  lastSyncAt: string | null;
}

export interface ConnectResult {
  status: ProviderStatus;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Contract every marketing-platform connector must implement.
 * Concrete connectors are intentionally side-effect free for now: they return
 * mocked values and perform no external network requests.
 */
export interface ProviderConnector {
  readonly type: ProviderType;

  /** Establish a connection using the provided credentials. */
  connect(credentials: ProviderCredentials): Promise<ConnectResult>;

  /** Tear down the connection. */
  disconnect(): Promise<void>;

  /** Check whether the given credentials are usable. */
  validateCredentials(credentials: ProviderCredentials): Promise<ValidationResult>;

  /** Pull audience metadata (lists / segments / automations) from the provider. */
  syncAudiences(): Promise<ProviderAudience[]>;

  /** Return the contact count for a single external audience. */
  getAudienceSize(externalId: string): Promise<number>;

  /** Pull aggregated stats back from the provider. */
  syncStats(): Promise<ProviderStats>;
}

/** Shared base with helpers common to every connector. */
export abstract class BaseProviderConnector implements ProviderConnector {
  abstract readonly type: ProviderType;

  abstract connect(credentials: ProviderCredentials): Promise<ConnectResult>;
  abstract disconnect(): Promise<void>;
  abstract validateCredentials(
    credentials: ProviderCredentials,
  ): Promise<ValidationResult>;
  abstract syncAudiences(): Promise<ProviderAudience[]>;
  abstract getAudienceSize(externalId: string): Promise<number>;
  abstract syncStats(): Promise<ProviderStats>;
}
