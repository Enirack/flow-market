import { randomUUID } from 'node:crypto';
import type {
  CreatePaymentIntentInput,
  CreatePayoutInput,
  CreateRefundInput,
  PayoutResult,
  PaymentIntentResult,
  PaymentProviderAdapter,
  RefundResult,
  WebhookEvent,
  WebhookVerificationInput,
} from '../types';

/**
 * Provider factice utilise en developpement/tests lorsqu'aucune cle API reelle
 * n'est configuree. Il n'effectue aucun appel reseau : il cree une intention en
 * statut PENDING que l'appelant confirme explicitement via `simulateWebhookEvent`
 * (expose par un controleur dev-only), ce qui permet de verifier en conditions
 * reelles toute la mecanique (webhook -> transaction -> solde -> commande) sans
 * dependre d'un provider de paiement externe.
 */
export class MockPaymentProvider implements PaymentProviderAdapter {
  readonly name = 'MOCK' as const;
  readonly supportedCurrencies = ['XOF', 'USD', 'EUR'] as const;

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
    const providerPaymentId = `mock_pi_${randomUUID()}`;
    return {
      providerPaymentId,
      status: 'PENDING',
      clientPayload: { mockPaymentId: providerPaymentId, amount: input.amount, currency: input.currency },
    };
  }

  async verifyAndParseWebhook(input: WebhookVerificationInput): Promise<WebhookEvent> {
    const body = input.parsedBody as {
      type: WebhookEvent['type'];
      providerPaymentId: string;
      amount: number;
      currency: string;
    };
    return {
      type: body.type,
      providerPaymentId: body.providerPaymentId,
      providerEventId: `mock_evt_${randomUUID()}`,
      amount: body.amount,
      currency: body.currency,
      raw: body,
    };
  }

  async createRefund(_input: CreateRefundInput): Promise<RefundResult> {
    return { providerRefundId: `mock_re_${randomUUID()}`, status: 'SUCCEEDED' };
  }

  async createPayout(_input: CreatePayoutInput): Promise<PayoutResult> {
    return { providerPayoutId: `mock_po_${randomUUID()}`, status: 'PAID' };
  }

  /** Construit un evenement webhook synthetique pour un providerPaymentId donne. */
  buildSimulatedEvent(
    providerPaymentId: string,
    outcome: 'succeeded' | 'failed',
    amount: number,
    currency: string,
  ): Record<string, unknown> {
    return {
      type: outcome === 'succeeded' ? 'payment.succeeded' : 'payment.failed',
      providerPaymentId,
      amount,
      currency,
    };
  }
}
