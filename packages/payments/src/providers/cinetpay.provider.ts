import {
  UnsupportedProviderOperationError,
  WebhookSignatureError,
  type CreatePaymentIntentInput,
  type CreatePayoutInput,
  type CreateRefundInput,
  type PayoutResult,
  type PaymentIntentResult,
  type PaymentProviderAdapter,
  type RefundResult,
  type WebhookEvent,
  type WebhookVerificationInput,
} from '../types';

export interface CinetPayProviderConfig {
  apiKey: string;
  siteId: string;
  /** Identifiants du compte "Transfert d'argent" CinetPay, distincts de l'API de paiement. */
  transferLogin?: string;
  transferPassword?: string;
  baseUrl?: string;
  transferBaseUrl?: string;
}

/**
 * Agregateur ouest-africain (mobile money + cartes), facture en XOF.
 *
 * Reference : https://docs.cinetpay.com. CinetPay ne signe pas sa notification
 * (notify_url) par HMAC : elle sert uniquement de declencheur. Le statut
 * autoritaire s'obtient en rappelant l'API "check" avec l'apikey/site_id, ce
 * que fait `verifyAndParseWebhook` avant de faire confiance a la transaction.
 *
 * CinetPay ne propose pas d'API de remboursement en libre-service pour le
 * produit "Checkout" standard (les remboursements passent par le support) :
 * `createRefund` leve donc UnsupportedProviderOperationError. Le transfert
 * d'argent (payout) utilise un compte et des identifiants distincts de l'API
 * de paiement ; a valider contre le bac a sable CinetPay avant mise en
 * production.
 */
export class CinetPayProvider implements PaymentProviderAdapter {
  readonly name = 'CINETPAY' as const;
  readonly supportedCurrencies = ['XOF', 'XAF'] as const;

  private readonly baseUrl: string;
  private readonly transferBaseUrl: string;

  constructor(private readonly config: CinetPayProviderConfig) {
    this.baseUrl = config.baseUrl ?? 'https://api-checkout.cinetpay.com/v2';
    this.transferBaseUrl = config.transferBaseUrl ?? 'https://client.cinetpay.com/v1';
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
    const res = await fetch(`${this.baseUrl}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: this.config.apiKey,
        site_id: this.config.siteId,
        transaction_id: input.idempotencyKey,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        customer_email: input.customerEmail,
        notify_url: input.metadata.notifyUrl,
        return_url: input.metadata.returnUrl,
        channels: 'ALL',
      }),
    });

    const json = (await res.json()) as { code: string; message: string; data?: { payment_url: string } };
    if (json.code !== '201' || !json.data) {
      throw new Error(`CinetPay API error on /payment: ${json.message}`);
    }

    return {
      providerPaymentId: input.idempotencyKey,
      status: 'PENDING',
      clientPayload: { checkoutUrl: json.data.payment_url },
    };
  }

  async verifyAndParseWebhook(input: WebhookVerificationInput): Promise<WebhookEvent> {
    const body = input.parsedBody as { cpm_trans_id?: string };
    const transactionId = body.cpm_trans_id;
    if (!transactionId) {
      throw new WebhookSignatureError(this.name, 'missing cpm_trans_id in notification body');
    }

    const res = await fetch(`${this.baseUrl}/payment/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey: this.config.apiKey, site_id: this.config.siteId, transaction_id: transactionId }),
    });

    const json = (await res.json()) as {
      code: string;
      data?: { status: string; amount: number; currency: string };
    };

    if (!json.data) {
      throw new WebhookSignatureError(this.name, 'transaction check returned no data');
    }

    const succeeded = json.code === '00' && json.data.status === 'ACCEPTED';
    return {
      type: succeeded ? 'payment.succeeded' : 'payment.failed',
      providerPaymentId: transactionId,
      providerEventId: `${transactionId}:${json.data.status}`,
      amount: json.data.amount,
      currency: json.data.currency,
      raw: body,
    };
  }

  async createRefund(_input: CreateRefundInput): Promise<RefundResult> {
    throw new UnsupportedProviderOperationError(this.name, 'createRefund');
  }

  async createPayout(input: CreatePayoutInput): Promise<PayoutResult> {
    if (!this.config.transferLogin || !this.config.transferPassword) {
      throw new UnsupportedProviderOperationError(this.name, 'createPayout (transfer credentials not configured)');
    }
    const destination = input.destinationDetails as { phoneNumber: string; countryCode: string };

    const auth = await fetch(`${this.transferBaseUrl}/auth/login?apikey=${this.config.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ login: this.config.transferLogin, password: this.config.transferPassword }),
    });
    const authJson = (await auth.json()) as { code: number; data?: { token: string } };
    if (!authJson.data) {
      throw new Error('CinetPay transfer authentication failed');
    }

    const res = await fetch(
      `${this.transferBaseUrl}/transfer/money/send/contact?token=${authJson.data.token}&lang=fr`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          prefix: destination.countryCode,
          phone: destination.phoneNumber,
          amount: String(input.amount),
          notify_url: '',
          client_transaction_id: input.idempotencyKey,
        }),
      },
    );
    const json = (await res.json()) as { code: number; data?: { transaction_id: string } };

    return {
      providerPayoutId: json.data?.transaction_id ?? input.idempotencyKey,
      status: json.code === 0 ? 'PROCESSING' : 'FAILED',
    };
  }
}
