import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlutterwaveProvider } from './flutterwave.provider';
import { WebhookSignatureError } from '../types';

const WEBHOOK_HASH = 'flw_test_webhook_hash_for_flowmarket_unit_tests';

describe('FlutterwaveProvider webhook verification', () => {
  const provider = new FlutterwaveProvider({ secretKey: 'FLWSECK_test_dummy', webhookHash: WEBHOOK_HASH });
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        message: 'ok',
        data: { id: 123, tx_ref: 'order-1-attempt-1', amount: 50000, currency: 'XOF', status: 'successful' },
      }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('accepts a webhook whose verif-hash matches the configured secret', async () => {
    const body = { event: 'charge.completed', data: { id: 123, tx_ref: 'order-1-attempt-1', amount: 50000, currency: 'XOF', status: 'successful' } };

    const result = await provider.verifyAndParseWebhook({
      rawBody: Buffer.from(JSON.stringify(body), 'utf8'),
      headers: { 'verif-hash': WEBHOOK_HASH },
      parsedBody: body,
    });

    expect(result.type).toBe('payment.succeeded');
    expect(result.providerPaymentId).toBe('order-1-attempt-1');
  });

  it('rejects a webhook with a mismatched verif-hash', async () => {
    const body = { event: 'charge.completed', data: { id: 123, tx_ref: 'order-1-attempt-1', amount: 50000, currency: 'XOF', status: 'successful' } };

    await expect(
      provider.verifyAndParseWebhook({
        rawBody: Buffer.from(JSON.stringify(body), 'utf8'),
        headers: { 'verif-hash': 'wrong-hash' },
        parsedBody: body,
      }),
    ).rejects.toThrow(WebhookSignatureError);
  });

  it('rejects a webhook with no verif-hash header', async () => {
    const body = { event: 'charge.completed', data: { id: 123, tx_ref: 'order-1-attempt-1', amount: 50000, currency: 'XOF', status: 'successful' } };

    await expect(
      provider.verifyAndParseWebhook({
        rawBody: Buffer.from(JSON.stringify(body), 'utf8'),
        headers: {},
        parsedBody: body,
      }),
    ).rejects.toThrow(WebhookSignatureError);
  });

  it('rejects a verif-hash of different length without throwing on the length mismatch itself', async () => {
    const body = { event: 'charge.completed', data: { id: 123, tx_ref: 'order-1-attempt-1', amount: 50000, currency: 'XOF', status: 'successful' } };

    await expect(
      provider.verifyAndParseWebhook({
        rawBody: Buffer.from(JSON.stringify(body), 'utf8'),
        headers: { 'verif-hash': 'short' },
        parsedBody: body,
      }),
    ).rejects.toThrow(WebhookSignatureError);
  });
});
