import { Body, Controller, Param, Post } from '@nestjs/common';
import { SimulateMockPaymentDto } from './dto/simulate-mock-payment.dto';
import { PaymentsService } from './payments.service';

/**
 * Outil de developpement : simule la reception d'un webhook pour un paiement
 * MOCK, en empruntant exactement le meme chemin de code que les webhooks
 * providers reels (PaymentsService.handleWebhook). Desactive au niveau service
 * des que PAYMENT_PROVIDER_MODE=live.
 */
@Controller('payments/mock')
export class MockPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':providerPaymentId/simulate')
  simulate(@Param('providerPaymentId') providerPaymentId: string, @Body() dto: SimulateMockPaymentDto) {
    return this.paymentsService.simulateMockEvent(providerPaymentId, dto.outcome);
  }
}
