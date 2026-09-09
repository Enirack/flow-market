import { describe, expect, it } from 'vitest';
import { MockPaymentProvider } from './mock.provider';

describe('MockPaymentProvider', () => {
  it('creates a pending intent without any network call', async () => {
    const provider = new MockPaymentProvider();

    const result = await provider.createPaymentIntent({
      idempotencyKey: 'order:1:attempt:1',
      orderId: 'order-1',
      amount: 5000,
      currency: 'XOF',
      description: 'Test',
      customerEmail: 'client@flowmarket.dev',
      metadata: {},
    });

    expect(result.status).toBe('PENDING');
    expect(result.providerPaymentId).toMatch(/^mock_pi_/);
  });

  it('round-trips a simulated succeeded event through verifyAndParseWebhook', async () => {
    const provider = new MockPaymentProvider();
    const intent = await provider.createPaymentIntent({
      idempotencyKey: 'order:2:attempt:1',
      orderId: 'order-2',
      amount: 1000,
      currency: 'XOF',
      description: 'Test',
      customerEmail: 'client@flowmarket.dev',
      metadata: {},
    });

    const simulated = provider.buildSimulatedEvent(intent.providerPaymentId, 'succeeded', 1000, 'XOF');
    const event = await provider.verifyAndParseWebhook({
      rawBody: Buffer.from(JSON.stringify(simulated)),
      headers: {},
      parsedBody: simulated,
    });

    expect(event.type).toBe('payment.succeeded');
    expect(event.providerPaymentId).toBe(intent.providerPaymentId);
    expect(event.amount).toBe(1000);
  });

  it('round-trips a simulated failed event', async () => {
    const provider = new MockPaymentProvider();
    const simulated = provider.buildSimulatedEvent('mock_pi_x', 'failed', 500, 'XOF');
    const event = await provider.verifyAndParseWebhook({
      rawBody: Buffer.from(JSON.stringify(simulated)),
      headers: {},
      parsedBody: simulated,
    });

    expect(event.type).toBe('payment.failed');
  });
});
