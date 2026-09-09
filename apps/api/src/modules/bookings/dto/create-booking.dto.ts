import { IsArray, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  serviceId!: string;

  @IsISO8601()
  scheduledAt!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  optionIds?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
