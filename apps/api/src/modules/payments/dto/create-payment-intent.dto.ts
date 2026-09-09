import { IsIn, IsOptional } from 'class-validator';

const SELECTABLE_PROVIDERS = ['STRIPE', 'FLUTTERWAVE', 'CINETPAY', 'PAYDUNYA'] as const;

export class CreatePaymentIntentDto {
  /** Provider explicite (optionnel) ; a defaut, resolu automatiquement selon la devise de la commande. */
  @IsOptional()
  @IsIn(SELECTABLE_PROVIDERS)
  provider?: (typeof SELECTABLE_PROVIDERS)[number];
}
