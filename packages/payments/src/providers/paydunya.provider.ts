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

export interface PayDunyaProviderConfig {
  masterKey: string;
  privateKey: string;
  token: string;
  storeName: string;
  baseUrl?: string;
}

/**
 * Agregateur senegalais (Orange Money, Wave, cartes), facture en XOF.
 *
 * Reference : https://paydunya.com/developers. Comme CinetPay, l'IPN
 * (callback_url) n'est qu'un declencheur : le statut autoritaire s'obtient en
 * rappelant l'API de confirmation avec les 3 cles PayDunya avant de faire
 * confiance a la transaction.
 *
 * PayDunya est utilise ici uniquement pour l'encaissement : ni remboursement
 * ni virement sortant en libre-service ne sont exposes par l'API "Checkout"
 * standard documentee publiquement, donc `createRefund`/`createPayout` levent
 * UnsupportedProviderOperationError (les virements prestataires passent par
 * Flutterwave/CinetPay).
 */
export class PayDunyaProvider implements PaymentProviderAdapter {
  readonly name = 'PAYDUNYA' as const;
  readonly supportedCurrencies = ['XOF'] as const;

  private readonly baseUrl: string;

  constructor(private readonly config: PayDunyaProviderConfig) {
    this.baseUrl = config.baseUrl ?? 'https://app.paydunya.com/api/v1';
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
    const res = await fetch(`${this.baseUrl}/checkout-invoice/create`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        invoice: {
          total_amount: input.amount,
          description: input.description,
        },
        store: { name: this.config.storeName },
        actions: {
          cancel_url: input.metadata.cancelUrl,
          return_url: input.metadata.returnUrl,
          callback_url: input.metadata.callbackUrl,
        },
        custom_data: { idempotencyKey: input.idempotencyKey, orderId: input.orderId },
      }),
    });

    const json = (await res.json()) as { response_code: string; response_text: string; token?: string };
    if (json.response_code !== '00' || !json.token) {
      throw new Error(`PayDunya API error on /checkout-invoice/create: ${json.response_text}`);
    }

    return {
      providerPaymentId: json.token,
      status: 'PENDING',
      clientPayload: { checkoutUrl: json.response_text },
    };
  }

  async verifyAndParseWebhook(input: WebhookVerificationInput): Promise<WebhookEvent> {
    const body = input.parsedBody as { data?: string };
    let token: string | undefined;
    try {
      token = body.data ? (JSON.parse(body.data) as { invoice?: { token?: string } }).invoice?.token : undefined;
    } catch {
      throw new WebhookSignatureError(this.name, 'malformed IPN payload');
    }
    if (!token) {
      throw new WebhookSignatureError(this.name, 'missing invoice token in IPN payload');
    }

    const res = await fetch(`${this.baseUrl}/checkout-invoice/confirm/${token}`, {
      headers: this.authHeaders(),
    });
    const json = (await res.json()) as {
      response_code: string;
      status: string;
      invoice?: { total_amount: number };
    };

    const succeeded = json.response_code === '00' && json.status === 'completed';
    return {
      type: succeeded ? 'payment.succeeded' : 'payment.failed',
      providerPaymentId: token,
      providerEventId: `${token}:${json.status}`,
      amount: json.invoice?.total_amount ?? 0,
      currency: 'XOF',
      raw: body,
    };
  }

  async createRefund(_input: CreateRefundInput): Promise<RefundResult> {
    throw new UnsupportedProviderOperationError(this.name, 'createRefund');
  }

  async createPayout(_input: CreatePayoutInput): Promise<PayoutResult> {
    throw new UnsupportedProviderOperationError(this.name, 'createPayout');
  }

  private authHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': this.config.masterKey,
      'PAYDUNYA-PRIVATE-KEY': this.config.privateKey,
      'PAYDUNYA-TOKEN': this.config.token,
    };
  }
}
