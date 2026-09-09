import { IsIn, IsOptional } from 'class-validator';

const PAYOUT_PROVIDERS = ['FLUTTERWAVE', 'CINETPAY'] as const;

export class ApprovePayoutDto {
  /** Provider a utiliser pour executer le virement (optionnel ; resolu par devise sinon). */
  @IsOptional()
  @IsIn(PAYOUT_PROVIDERS)
  provider?: (typeof PAYOUT_PROVIDERS)[number];
}
