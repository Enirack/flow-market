import { Module } from '@nestjs/common';
import { MockPaymentsController } from './mock-payments.controller';
import { paymentProviderRegistryProvider } from './payment-provider-registry.provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsWebhooksController } from './payments-webhooks.controller';

@Module({
  controllers: [PaymentsController, PaymentsWebhooksController, MockPaymentsController],
  providers: [PaymentsService, paymentProviderRegistryProvider],
  exports: [PaymentsService, paymentProviderRegistryProvider],
})
export class PaymentsModule {}
