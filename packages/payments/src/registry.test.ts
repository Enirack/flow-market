import { describe, expect, it } from 'vitest';
import { PaymentProviderRegistry } from './registry';
import { MockPaymentProvider } from './providers/mock.provider';
import type { PaymentProviderAdapter } from './types';

function fakeAdapter(name: PaymentProviderAdapter['name'], currencies: string[]): PaymentProviderAdapter {
  return {
    name,
    supportedCurrencies: currencies,
    createPaymentIntent: async () => {
      throw new Error('not implemented');
    },
    verifyAndParseWebhook: async () => {
      throw new Error('not implemented');
    },
    createRefund: async () => {
      throw new Error('not implemented');
    },
    createPayout: async () => {
      throw new Error('not implemented');
    },
  };
}

describe('PaymentProviderRegistry', () => {
  it('resolves the configured provider that supports the requested currency', () => {
    const registry = new PaymentProviderRegistry([fakeAdapter('STRIPE', ['USD', 'EUR']), fakeAdapter('CINETPAY', ['XOF'])]);

    expect(registry.resolveForCurrency('XOF', { allowMock: false }).name).toBe('CINETPAY');
    expect(registry.resolveForCurrency('usd', { allowMock: false }).name).toBe('STRIPE');
  });

  it('honors an explicit preferred provider when it supports the currency', () => {
    const registry = new PaymentProviderRegistry([fakeAdapter('STRIPE', ['USD']), fakeAdapter('FLUTTERWAVE', ['USD', 'XOF'])]);

    expect(registry.resolveForCurrency('USD', { preferred: 'FLUTTERWAVE', allowMock: false }).name).toBe('FLUTTERWAVE');
  });

  it('rejects a preferred provider that does not support the currency', () => {
    const registry = new PaymentProviderRegistry([fakeAdapter('STRIPE', ['USD'])]);

    expect(() => registry.resolveForCurrency('XOF', { preferred: 'STRIPE', allowMock: false })).toThrow(/does not support/);
  });

  it('throws for an unconfigured provider', () => {
    const registry = new PaymentProviderRegistry([fakeAdapter('STRIPE', ['USD'])]);

    expect(() => registry.get('CINETPAY')).toThrow(/not configured/);
  });

  it('excludes MOCK from currency resolution unless allowMock is true', () => {
    const registry = new PaymentProviderRegistry([new MockPaymentProvider()]);

    expect(() => registry.resolveForCurrency('XOF', { allowMock: false })).toThrow(/No payment provider/);
    expect(registry.resolveForCurrency('XOF', { allowMock: true }).name).toBe('MOCK');
  });

  it('rejects an explicit MOCK preference when mock is not allowed', () => {
    const registry = new PaymentProviderRegistry([new MockPaymentProvider()]);

    expect(() => registry.resolveForCurrency('XOF', { preferred: 'MOCK', allowMock: false })).toThrow(/cannot be used/);
  });
});
