import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min, MinLength } from 'class-validator';

const PRICE_TYPES = ['FIXED', 'HOURLY', 'PACKAGE'] as const;

export class UpdateServiceDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(20, { message: 'description must be at least 20 characters' })
  description?: string;

  @IsOptional()
  @IsIn(PRICE_TYPES)
  priceType?: (typeof PRICE_TYPES)[number];

  @IsOptional()
  @IsNumber()
  @IsPositive()
  basePrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;
}
