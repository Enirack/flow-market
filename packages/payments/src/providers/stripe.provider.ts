import Stripe from 'stripe';
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

export interface StripeProviderConfig {
  secretKey: string;
  webhookSecret: string;
}

/**
 * Encaisse les paiements par carte (clients hors zone UEMOA, en USD/EUR).
 * Les virements aux prestataires transitent par Flutterwave/CinetPay (mobile
 * money / virement bancaire local) : Stripe Connect n'est pas utilise ici.
 */
export class StripeProvider implements PaymentProviderAdapter {
  readonly name = 'STRIPE' as const;
  readonly supportedCurrencies = ['USD', 'EUR'] as const;

  private readonly stripe: Stripe;

  constructor(private readonly config: StripeProviderConfig) {
    this.stripe = new Stripe(config.secretKey);
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
    const intent = await this.stripe.paymentIntents.create(
      {
        amount: toMinorUnits(input.amount, input.currency),
        currency: input.currency.toLowerCase(),
        description: input.description,
        receipt_email: input.customerEmail,
        metadata: input.metadata,
        automatic_payment_methods: { enabled: true },
      },
      { idempotencyKey: input.idempotencyKey },
    );

    return {
      providerPaymentId: intent.id,
      status: intent.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING',
      clientPayload: { clientSecret: intent.client_secret },
    };
  }

  async verifyAndParseWebhook(input: WebhookVerificationInput): Promise<WebhookEvent> {
    const signature = input.headers['stripe-signature'];
    if (typeof signature !== 'string') {
      throw new WebhookSignatureError(this.name, 'missing stripe-signature header');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(input.rawBody, signature, this.config.webhookSecret);
    } catch (error) {
      throw new WebhookSignatureError(this.name, error instanceof Error ? error.message : undefined);
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        return {
          type: 'payment.succeeded',
          providerPaymentId: intent.id,
          providerEventId: event.id,
          amount: fromMinorUnits(intent.amount_received, intent.currency),
          currency: intent.currency.toUpperCase(),
          raw: event,
        };
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        return {
          type: 'payment.failed',
          providerPaymentId: intent.id,
          providerEventId: event.id,
          amount: fromMinorUnits(intent.amount, intent.currency),
          currency: intent.currency.toUpperCase(),
          raw: event,
        };
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        return {
          type: 'refund.succeeded',
          providerPaymentId: typeof charge.payment_intent === 'string' ? charge.payment_intent : '',
          providerEventId: event.id,
          amount: fromMinorUnits(charge.amount_refunded, charge.currency),
          currency: charge.currency.toUpperCase(),
          raw: event,
        };
      }
      default:
        throw new WebhookSignatureError(this.name, `unhandled event type: ${event.type}`);
    }
  }

  async createRefund(input: CreateRefundInput): Promise<RefundResult> {
    const refund = await this.stripe.refunds.create(
      {
        payment_intent: input.providerPaymentId,
        amount: toMinorUnits(input.amount, input.currency),
        reason: 'requested_by_customer',
      },
      { idempotencyKey: input.idempotencyKey },
    );

    return {
      providerRefundId: refund.id,
      status: refund.status === 'succeeded' ? 'SUCCEEDED' : refund.status === 'failed' ? 'FAILED' : 'PROCESSING',
    };
  }

  async createPayout(_input: CreatePayoutInput): Promise<PayoutResult> {
    throw new UnsupportedProviderOperationError(this.name, 'createPayout');
  }
}

/** Stripe utilise la plus petite unite monetaire ; le XOF (zero-decimal) n'est pas propose par ce provider. */
function toMinorUnits(amount: number, currency: string): number {
  const zeroDecimal = ['XOF', 'XAF', 'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'VND', 'VUV'];
  return zeroDecimal.includes(currency.toUpperCase()) ? Math.round(amount) : Math.round(amount * 100);
}

function fromMinorUnits(amount: number, currency: string): number {
  const zeroDecimal = ['XOF', 'XAF', 'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'VND', 'VUV'];
  return zeroDecimal.includes(currency.toUpperCase()) ? amount : amount / 100;
}
