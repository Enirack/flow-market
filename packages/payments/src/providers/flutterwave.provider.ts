import { timingSafeEqual } from 'node:crypto';
import { WebhookSignatureError, type CreatePaymentIntentInput, type CreatePayoutInput, type CreateRefundInput, type PayoutResult, type PaymentIntentResult, type PaymentProviderAdapter, type RefundResult, type WebhookEvent, type WebhookVerificationInput } from '../types';

/** Comparaison en temps constant : evite de fuiter le secret via le timing de `===`. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export interface FlutterwaveProviderConfig {
  secretKey: string;
  /** Secret hash configure dans le dashboard Flutterwave (verifie via l'en-tete verif-hash). */
  webhookHash: string;
  baseUrl?: string;
}

interface FlutterwaveApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T;
}

/**
 * Passerelle pan-africaine : cartes, mobile money et virements bancaires
 * multi-devises (XOF, NGN, GHS, USD...). Utilisee ici pour l'encaissement XOF
 * et pour les virements sortants (payouts) vers les prestataires.
 *
 * Reference : https://developer.flutterwave.com/docs (API v3). Le webhook
 * n'est pas signe par HMAC : Flutterwave renvoie l'en-tete `verif-hash`, qui
 * doit correspondre exactement au secret configure cote dashboard. Par
 * defense en profondeur, on revalide egalement la transaction aupres de
 * l'API (GET /transactions/:id/verify) avant de faire confiance au montant
 * et au statut annonces dans le payload webhook.
 */
export class FlutterwaveProvider implements PaymentProviderAdapter {
  readonly name = 'FLUTTERWAVE' as const;
  readonly supportedCurrencies = ['XOF', 'NGN', 'GHS', 'USD', 'KES'] as const;

  private readonly baseUrl: string;

  constructor(private readonly config: FlutterwaveProviderConfig) {
    this.baseUrl = config.baseUrl ?? 'https://api.flutterwave.com/v3';
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
    const response = await this.request<{ link: string }>('/payments', 'POST', {
      tx_ref: input.idempotencyKey,
      amount: input.amount,
      currency: input.currency,
      customer: { email: input.customerEmail },
      meta: input.metadata,
      redirect_url: input.metadata.redirectUrl,
    });

    return {
      providerPaymentId: input.idempotencyKey,
      status: 'PENDING',
      clientPayload: { checkoutUrl: response.data.link },
    };
  }

  async verifyAndParseWebhook(input: WebhookVerificationInput): Promise<WebhookEvent> {
    const signature = input.headers['verif-hash'];
    if (typeof signature !== 'string' || !safeEqual(signature, this.config.webhookHash)) {
      throw new WebhookSignatureError(this.name, 'verif-hash mismatch');
    }

    const body = input.parsedBody as {
      event: string;
      data: { id: number; tx_ref: string; amount: number; currency: string; status: string };
    };

    const verified = await this.request<{ id: number; tx_ref: string; amount: number; currency: string; status: string }>(
      `/transactions/${body.data.id}/verify`,
      'GET',
    );

    const succeeded = verified.data.status === 'successful';
    return {
      type: succeeded ? 'payment.succeeded' : 'payment.failed',
      providerPaymentId: verified.data.tx_ref,
      providerEventId: String(verified.data.id),
      amount: verified.data.amount,
      currency: verified.data.currency,
      raw: body,
    };
  }

  async createRefund(input: CreateRefundInput): Promise<RefundResult> {
    const response = await this.request<{ id: number; status: string }>(
      `/transactions/${input.providerPaymentId}/refund`,
      'POST',
      { amount: input.amount },
    );

    return {
      providerRefundId: String(response.data.id),
      status: response.data.status === 'completed' ? 'SUCCEEDED' : 'PROCESSING',
    };
  }

  async createPayout(input: CreatePayoutInput): Promise<PayoutResult> {
    const destination = input.destinationDetails as {
      accountBank: string;
      accountNumber: string;
      beneficiaryName: string;
    };

    const response = await this.request<{ id: number; status: string }>('/transfers', 'POST', {
      account_bank: destination.accountBank,
      account_number: destination.accountNumber,
      amount: input.amount,
      currency: input.currency,
      beneficiary_name: destination.beneficiaryName,
      reference: input.idempotencyKey,
      narration: 'FlowMarket - virement prestataire',
    });

    return {
      providerPayoutId: String(response.data.id),
      status: response.data.status === 'SUCCESSFUL' ? 'PAID' : 'PROCESSING',
    };
  }

  private async request<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<FlutterwaveApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const json = (await res.json()) as FlutterwaveApiResponse<T>;
    if (!res.ok || json.status !== 'success') {
      throw new Error(`Flutterwave API error on ${path}: ${json.message ?? res.statusText}`);
    }
    return json;
  }
}
