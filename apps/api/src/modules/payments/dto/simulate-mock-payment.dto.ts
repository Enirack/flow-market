import { IsIn } from 'class-validator';

export class SimulateMockPaymentDto {
  @IsIn(['succeeded', 'failed'])
  outcome!: 'succeeded' | 'failed';
}
