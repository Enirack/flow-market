export type PaymentProviderName = 'STRIPE' | 'FLUTTERWAVE' | 'CINETPAY' | 'PAYDUNYA' | 'MOCK';

export type PayoutMethod = 'BANK_TRANSFER' | 'MOBILE_MONEY';

export interface CreatePaymentIntentInput {
  /** Identifiant unique garantissant qu'un retry n'initie pas un second paiement. */
  idempotencyKey: string;
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  metadata: Record<string, string>;
}

export interface PaymentIntentResult {
  providerPaymentId: string;
  /** Etat immédiat renvoyé par le provider (avant confirmation webhook, sauf pour MOCK). */
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED';
  /** Donnees a renvoyer au client pour finaliser le paiement (clientSecret, lien de paiement, etc). */
  clientPayload: Record<string, unknown>;
}

export interface WebhookVerificationInput {
  rawBody: Buffer;
  headers: Record<string, string | string[] | undefined>;
  /** Corps deja parse en JSON (utilise par les providers qui n'ont pas de signature HMAC sur le rawBody). */
  parsedBody: unknown;
}

export type WebhookEventType = 'payment.succeeded' | 'payment.failed' | 'refund.succeeded' | 'refund.failed';

export interface WebhookEvent {
  type: WebhookEventType;
  providerPaymentId: string;
  /** Identifiant d'evenement provider, utilise pour la deduplication (idempotence webhook). */
  providerEventId: string;
  amount: number;
  currency: string;
  raw: unknown;
}

export interface CreateRefundInput {
  idempotencyKey: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  reason?: string;
}

export interface RefundResult {
  providerRefundId: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
}

export interface CreatePayoutInput {
  idempotencyKey: string;
  amount: number;
  currency: string;
  method: PayoutMethod;
  destinationDetails: Record<string, unknown>;
}

export interface PayoutResult {
  providerPayoutId: string;
  status: 'PROCESSING' | 'PAID' | 'FAILED';
}

export class UnsupportedProviderOperationError extends Error {
  constructor(provider: PaymentProviderName, operation: string) {
    super(`${provider} does not support the "${operation}" operation on this platform`);
    this.name = 'UnsupportedProviderOperationError';
  }
}

export class WebhookSignatureError extends Error {
  constructor(provider: PaymentProviderName, detail?: string) {
    super(`Invalid webhook signature for provider ${provider}${detail ? `: ${detail}` : ''}`);
    this.name = 'WebhookSignatureError';
  }
}

/**
 * Abstraction commune a tous les fournisseurs de paiement. Chaque implementation
 * encapsule les specificites d'API du provider ; le reste de la plateforme ne
 * manipule jamais directement le SDK/l'API REST d'un provider donne, ce qui
 * permet d'ajouter ou de remplacer un provider sans toucher a la logique metier.
 */
export interface PaymentProviderAdapter {
  readonly name: PaymentProviderName;
  /** Devises acceptees par ce provider sur cette plateforme (ISO 4217, majuscules). */
  readonly supportedCurrencies: readonly string[];

  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;

  /** Verifie l'authenticite du webhook puis le normalise. Leve WebhookSignatureError si invalide. */
  verifyAndParseWebhook(input: WebhookVerificationInput): Promise<WebhookEvent>;

  /** Leve UnsupportedProviderOperationError si le provider ne gere pas les remboursements. */
  createRefund(input: CreateRefundInput): Promise<RefundResult>;

  /** Leve UnsupportedProviderOperationError si le provider ne gere pas les virements sortants. */
  createPayout(input: CreatePayoutInput): Promise<PayoutResult>;
}
