import type { Provider } from '@nestjs/common';
import {
  CinetPayProvider,
  FlutterwaveProvider,
  MockPaymentProvider,
  PayDunyaProvider,
  PaymentProviderRegistry,
  StripeProvider,
  type PaymentProviderAdapter,
} from '@flowmarket/payments';

export const PAYMENT_PROVIDER_REGISTRY = Symbol('PAYMENT_PROVIDER_REGISTRY');

/**
 * Construit le registre de providers a partir des cles API presentes en
 * environnement. Le provider MOCK est toujours enregistre (necessaire au
 * controleur de simulation dev-only) mais n'est jamais choisi par defaut :
 * PaymentsService verifie explicitement PAYMENT_PROVIDER_MODE avant de
 * l'autoriser comme resolution implicite.
 */
export function buildPaymentProviderRegistry(): PaymentProviderRegistry {
  const adapters: PaymentProviderAdapter[] = [new MockPaymentProvider()];

  if (process.env.STRIPE_SECRET_KEY) {
    adapters.push(
      new StripeProvider({
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
      }),
    );
  }

  if (process.env.FLUTTERWAVE_SECRET_KEY) {
    adapters.push(
      new FlutterwaveProvider({
        secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
        webhookHash: process.env.FLUTTERWAVE_WEBHOOK_HASH ?? '',
      }),
    );
  }

  if (process.env.CINETPAY_API_KEY) {
    adapters.push(
      new CinetPayProvider({
        apiKey: process.env.CINETPAY_API_KEY,
        siteId: process.env.CINETPAY_SITE_ID ?? '',
        ...(process.env.CINETPAY_TRANSFER_LOGIN ? { transferLogin: process.env.CINETPAY_TRANSFER_LOGIN } : {}),
        ...(process.env.CINETPAY_TRANSFER_PASSWORD
          ? { transferPassword: process.env.CINETPAY_TRANSFER_PASSWORD }
          : {}),
      }),
    );
  }

  if (process.env.PAYDUNYA_MASTER_KEY) {
    adapters.push(
      new PayDunyaProvider({
        masterKey: process.env.PAYDUNYA_MASTER_KEY,
        privateKey: process.env.PAYDUNYA_PRIVATE_KEY ?? '',
        token: process.env.PAYDUNYA_TOKEN ?? '',
        storeName: process.env.PAYDUNYA_STORE_NAME ?? 'FlowMarket',
      }),
    );
  }

  return new PaymentProviderRegistry(adapters);
}

export const paymentProviderRegistryProvider: Provider = {
  provide: PAYMENT_PROVIDER_REGISTRY,
  useFactory: buildPaymentProviderRegistry,
};
