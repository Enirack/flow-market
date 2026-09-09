import type { PaymentProviderAdapter, PaymentProviderName } from './types';

/**
 * Registre en memoire des adaptateurs de paiement disponibles. La decision de
 * quels adaptateurs construire (selon les cles API presentes en environnement)
 * appartient a l'appelant (apps/api) ; ce registre se contente de router les
 * demandes vers l'adaptateur adequat.
 */
export class PaymentProviderRegistry {
  private readonly adapters: Map<PaymentProviderName, PaymentProviderAdapter>;

  constructor(adapters: PaymentProviderAdapter[]) {
    this.adapters = new Map(adapters.map((adapter) => [adapter.name, adapter]));
  }

  get(name: PaymentProviderName): PaymentProviderAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Payment provider "${name}" is not configured on this environment`);
    }
    return adapter;
  }

  has(name: PaymentProviderName): boolean {
    return this.adapters.has(name);
  }

  /**
   * Resout un adaptateur pour une devise donnee. Si `preferred` est fourni, il
   * est utilise a condition de supporter la devise. Sinon, le premier
   * adaptateur configure supportant la devise est choisi (MOCK excepte, sauf
   * si `allowMock` vaut true).
   */
  resolveForCurrency(
    currency: string,
    options: { preferred?: PaymentProviderName; allowMock: boolean },
  ): PaymentProviderAdapter {
    const upperCurrency = currency.toUpperCase();

    if (options.preferred) {
      if (options.preferred === 'MOCK' && !options.allowMock) {
        throw new Error('Provider "MOCK" cannot be used in this environment');
      }
      const adapter = this.get(options.preferred);
      if (!adapter.supportedCurrencies.includes(upperCurrency)) {
        throw new Error(`Provider "${options.preferred}" does not support currency ${upperCurrency}`);
      }
      return adapter;
    }

    for (const adapter of this.adapters.values()) {
      if (adapter.name === 'MOCK' && !options.allowMock) continue;
      if (adapter.supportedCurrencies.includes(upperCurrency)) return adapter;
    }

    throw new Error(`No payment provider configured supports currency ${upperCurrency}`);
  }
}
