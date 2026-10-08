import { IsIn, IsString, MinLength } from 'class-validator';

const RESOLUTION_STATUSES = ['RESOLVED', 'REJECTED'] as const;

export class ResolveDisputeDto {
  @IsIn(RESOLUTION_STATUSES)
  status!: (typeof RESOLUTION_STATUSES)[number];

  @IsString()
  @MinLength(5)
  resolution!: string;
}
