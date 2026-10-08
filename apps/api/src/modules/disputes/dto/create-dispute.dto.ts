import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateDisputeDto {
  @IsUUID()
  bookingId!: string;

  @IsString()
  @MinLength(5)
  reason!: string;

  @IsOptional()
  @IsString()
  details?: string;
}
