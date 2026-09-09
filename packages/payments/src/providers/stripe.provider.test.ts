import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { StripeProvider } from './stripe.provider';
import { WebhookSignatureError } from '../types';

const WEBHOOK_SECRET = 'whsec_test_secret_for_flowmarket_unit_tests';

/** Reproduit exactement le schema de signature Stripe (Stripe-Signature: t=...,v1=...). */
function signStripePayload(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

describe('StripeProvider webhook verification', () => {
  const provider = new StripeProvider({ secretKey: 'sk_test_dummy', webhookSecret: WEBHOOK_SECRET });

  it('accepts a correctly signed payment_intent.succeeded event', async () => {
    const event = {
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_123',
          amount_received: 500000,
          currency: 'xof',
        },
      },
    };
    const payload = JSON.stringify(event);
    const signature = signStripePayload(payload, WEBHOOK_SECRET);

    const result = await provider.verifyAndParseWebhook({
      rawBody: Buffer.from(payload, 'utf8'),
      headers: { 'stripe-signature': signature },
      parsedBody: event,
    });

    expect(result.type).toBe('payment.succeeded');
    expect(result.providerPaymentId).toBe('pi_123');
    expect(result.amount).toBe(500000);
    expect(result.currency).toBe('XOF');
  });

  it('converts a non-zero-decimal currency amount from minor units', async () => {
    const event = {
      id: 'evt_2',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_456', amount_received: 5000, currency: 'usd' } },
    };
    const payload = JSON.stringify(event);
    const signature = signStripePayload(payload, WEBHOOK_SECRET);

    const result = await provider.verifyAndParseWebhook({
      rawBody: Buffer.from(payload, 'utf8'),
      headers: { 'stripe-signature': signature },
      parsedBody: event,
    });

    expect(result.amount).toBe(50);
  });

  it('rejects a payload signed with the wrong secret', async () => {
    const event = { id: 'evt_3', type: 'payment_intent.succeeded', data: { object: { id: 'pi_789' } } };
    const payload = JSON.stringify(event);
    const signature = signStripePayload(payload, 'whsec_completely_different_secret');

    await expect(
      provider.verifyAndParseWebhook({
        rawBody: Buffer.from(payload, 'utf8'),
        headers: { 'stripe-signature': signature },
        parsedBody: event,
      }),
    ).rejects.toThrow(WebhookSignatureError);
  });

  it('rejects a tampered payload (signature no longer matches body)', async () => {
    const event = { id: 'evt_4', type: 'payment_intent.succeeded', data: { object: { id: 'pi_999', amount_received: 100 } } };
    const payload = JSON.stringify(event);
    const signature = signStripePayload(payload, WEBHOOK_SECRET);
    const tamperedPayload = JSON.stringify({ ...event, data: { object: { id: 'pi_999', amount_received: 999999 } } });

    await expect(
      provider.verifyAndParseWebhook({
        rawBody: Buffer.from(tamperedPayload, 'utf8'),
        headers: { 'stripe-signature': signature },
        parsedBody: event,
      }),
    ).rejects.toThrow(WebhookSignatureError);
  });

  it('rejects a request with no stripe-signature header', async () => {
    const event = { id: 'evt_5', type: 'payment_intent.succeeded', data: { object: { id: 'pi_x' } } };
    const payload = JSON.stringify(event);

    await expect(
      provider.verifyAndParseWebhook({ rawBody: Buffer.from(payload, 'utf8'), headers: {}, parsedBody: event }),
    ).rejects.toThrow(WebhookSignatureError);
  });

  it('maps payment_intent.payment_failed to payment.failed', async () => {
    const event = {
      id: 'evt_6',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_failed', amount: 250000, currency: 'xof' } },
    };
    const payload = JSON.stringify(event);
    const signature = signStripePayload(payload, WEBHOOK_SECRET);

    const result = await provider.verifyAndParseWebhook({
      rawBody: Buffer.from(payload, 'utf8'),
      headers: { 'stripe-signature': signature },
      parsedBody: event,
    });

    expect(result.type).toBe('payment.failed');
  });
});
