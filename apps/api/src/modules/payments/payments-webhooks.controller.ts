import { Body, Controller, Headers, NotFoundException, Param, Post, Req, type RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import type { PaymentProviderName } from '@flowmarket/payments';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';

const VALID_PROVIDERS: readonly PaymentProviderName[] = ['STRIPE', 'FLUTTERWAVE', 'CINETPAY', 'PAYDUNYA', 'MOCK'];

/**
 * Endpoints publics appeles par les providers de paiement (aucune authentification
 * utilisateur : chaque adaptateur verifie lui-meme l'authenticite de la requete
 * via sa propre signature/verification serveur-a-serveur).
 */
@Controller('payments/webhooks')
export class PaymentsWebhooksController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post(':provider')
  handle(
    @Param('provider') providerParam: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const provider = providerParam.toUpperCase() as PaymentProviderName;
    if (!VALID_PROVIDERS.includes(provider)) {
      throw new NotFoundException(`Unknown payment provider: ${providerParam}`);
    }

    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(body ?? {}));
    return this.paymentsService.handleWebhook(provider, rawBody, headers, body);
  }
}
