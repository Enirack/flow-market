import { IsIn, IsNumber, IsObject, IsPositive } from 'class-validator';

const PAYOUT_METHODS = ['BANK_TRANSFER', 'MOBILE_MONEY'] as const;

export class RequestPayoutDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsIn(PAYOUT_METHODS)
  method!: (typeof PAYOUT_METHODS)[number];

  /** BANK_TRANSFER: { accountBank, accountNumber, beneficiaryName }. MOBILE_MONEY: { phoneNumber, countryCode }. */
  @IsObject()
  destinationDetails!: Record<string, unknown>;
}
